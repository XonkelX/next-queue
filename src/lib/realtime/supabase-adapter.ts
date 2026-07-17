import type { RealtimeChannel, SupabaseClient } from '@supabase/supabase-js';
import type { QueueSnapshot } from '@/features/queue/types';
import type { Database, Json } from '@/lib/supabase/database.types';
import { ensureAnonymousSession } from '@/lib/supabase/session';
import { createSupabaseBrowserClient } from '@/lib/supabase/client';
import type {
  QueueCreationResult,
  QueueRealtimeAdapter,
  QueueSubscriptionCallbacks,
} from './adapter';
import { QueueAdapterError, queueErrorCodes } from './errors';
import { errorSchema, snapshotSchema } from './schemas';

type SnapshotWithMetadata = QueueSnapshot & {
  accessCode?: string;
};

function requestId() {
  return crypto.randomUUID();
}

type RpcResult = {
  data: Json | null;
  error: { message: string } | null;
};

function isRetryableNetworkFailure(result: RpcResult) {
  return Boolean(
    result.error &&
    /failed to fetch|fetch failed|network error|load failed/i.test(
      result.error.message,
    ),
  );
}

export async function withStableRequestId<T>(
  operation: (requestId: string) => PromiseLike<T>,
  shouldRetry: (result: T) => boolean,
) {
  const stableRequestId = requestId();
  const first = await operation(stableRequestId);
  return shouldRetry(first) ? operation(stableRequestId) : first;
}

function parseResult(
  data: Json | null,
  transportError: { message: string } | null,
): SnapshotWithMetadata {
  if (transportError) {
    throw new QueueAdapterError(
      'UNKNOWN',
      'The queue service could not complete that request.',
    );
  }

  const error = errorSchema.safeParse(data);
  if (error.success) {
    const code = queueErrorCodes.includes(error.data.error as never)
      ? (error.data.error as (typeof queueErrorCodes)[number])
      : 'UNKNOWN';
    throw new QueueAdapterError(code, error.data.message);
  }

  const parsed = snapshotSchema.safeParse(data);
  if (!parsed.success) {
    throw new QueueAdapterError(
      'UNKNOWN',
      'The queue service returned an invalid snapshot.',
    );
  }

  const value = parsed.data;
  return {
    queue: value.queue,
    entries: value.entries,
    role: value.role,
    ...(value.ownEntryId ? { ownEntryId: value.ownEntryId } : {}),
    waitingCount: value.waitingCount,
    serverTime: value.serverTime,
    ...(value.accessCode ? { accessCode: value.accessCode } : {}),
  };
}

export class RevisionGate {
  private revision = -1;

  accept(snapshot: QueueSnapshot, force = false) {
    if (!force && snapshot.queue.revision <= this.revision) return false;
    if (snapshot.queue.revision < this.revision) return false;
    this.revision = snapshot.queue.revision;
    return true;
  }

  current() {
    return this.revision;
  }
}

export class SupabaseQueueAdapter implements QueueRealtimeAdapter {
  constructor(
    private readonly client: SupabaseClient<Database> = createSupabaseBrowserClient(),
  ) {}

  private async ready() {
    await ensureAnonymousSession(this.client);
  }

  private snapshot(result: {
    data: Json | null;
    error: { message: string } | null;
  }) {
    return parseResult(result.data, result.error);
  }

  private async mutate(
    operation: (stableRequestId: string) => PromiseLike<RpcResult>,
  ) {
    await this.ready();
    return this.snapshot(
      await withStableRequestId(operation, isRetryableNetworkFailure),
    );
  }

  async getSnapshot(slug: string) {
    await this.ready();
    return this.snapshot(
      await this.client.rpc('get_queue_snapshot', { queue_slug: slug }),
    );
  }

  async createQueue(
    name: string,
    prefix: string,
  ): Promise<QueueCreationResult> {
    const result = await this.mutate((stableRequestId) =>
      this.client.rpc('create_queue', {
        queue_name: name,
        queue_prefix: prefix,
        request_id: stableRequestId,
      }),
    );
    const { accessCode, ...snapshot } = result;
    return { snapshot, ...(accessCode ? { accessCode } : {}) };
  }

  async claimStaffAccess(slug: string, accessCode: string) {
    return this.mutate((stableRequestId) =>
      this.client.rpc('claim_staff_access', {
        queue_slug: slug,
        access_code: accessCode,
        request_id: stableRequestId,
      }),
    );
  }

  async joinQueue(slug: string, displayName?: string) {
    return this.mutate((stableRequestId) =>
      this.client.rpc('join_queue', {
        queue_slug: slug,
        display_name: displayName ?? '',
        request_id: stableRequestId,
      }),
    );
  }

  async callNext(queueId: string) {
    return this.mutate((stableRequestId) =>
      this.client.rpc('call_next', {
        queue_id: queueId,
        request_id: stableRequestId,
      }),
    );
  }

  async completeCurrent(queueId: string) {
    return this.mutate((stableRequestId) =>
      this.client.rpc('complete_active', {
        queue_id: queueId,
        request_id: stableRequestId,
      }),
    );
  }

  async skipEntry(queueId: string, entryId: string) {
    return this.mutate((stableRequestId) =>
      this.client.rpc('skip_entry', {
        queue_id: queueId,
        entry_id: entryId,
        request_id: stableRequestId,
      }),
    );
  }

  async pauseQueue(queueId: string) {
    return this.mutate((stableRequestId) =>
      this.client.rpc('pause_queue', {
        queue_id: queueId,
        request_id: stableRequestId,
      }),
    );
  }

  async reopenQueue(queueId: string) {
    return this.mutate((stableRequestId) =>
      this.client.rpc('reopen_queue', {
        queue_id: queueId,
        request_id: stableRequestId,
      }),
    );
  }

  async closeQueue(queueId: string) {
    return this.mutate((stableRequestId) =>
      this.client.rpc('close_queue', {
        queue_id: queueId,
        request_id: stableRequestId,
      }),
    );
  }

  async subscribe(slug: string, callbacks: QueueSubscriptionCallbacks) {
    callbacks.onConnectionState(navigator.onLine ? 'connecting' : 'offline');
    const preliminary = await this.getSnapshot(slug);
    const gate = new RevisionGate();
    let stopped = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let refreshInFlight: Promise<boolean> | undefined;
    let refreshQueued = false;
    let hiddenAt = 0;

    const refresh = (reason: string, force = false): Promise<boolean> => {
      if (stopped) return Promise.resolve(false);
      if (refreshInFlight) {
        refreshQueued = true;
        return refreshInFlight;
      }
      refreshInFlight = this.getSnapshot(slug)
        .then((snapshot) => {
          if (gate.accept(snapshot, force)) callbacks.onSnapshot(snapshot);
          if (process.env.NODE_ENV === 'development') {
            console.debug('[queue-sync]', {
              reason,
              revision: snapshot.queue.revision,
            });
          }
          return true;
        })
        .catch((error: unknown) => {
          callbacks.onError(
            error instanceof Error
              ? error
              : new Error('Snapshot refresh failed.'),
          );
          return false;
        })
        .finally(() => {
          refreshInFlight = undefined;
          if (refreshQueued) {
            refreshQueued = false;
            void refresh('queued-invalidation');
          }
        });
      return refreshInFlight;
    };

    const invalidate = () => {
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => void refresh('postgres-change'), 75);
    };

    const channel: RealtimeChannel = this.client
      .channel(`queue:${preliminary.queue.id}:changes`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'queues',
          filter: `id=eq.${preliminary.queue.id}`,
        },
        invalidate,
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'queue_entries',
          filter: `queue_id=eq.${preliminary.queue.id}`,
        },
        invalidate,
      )
      .subscribe((status) => {
        if (process.env.NODE_ENV === 'development')
          console.debug('[queue-sync]', { status });
        if (status === 'SUBSCRIBED') {
          callbacks.onConnectionState('connected');
          void refresh('subscribed', true);
        } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
          callbacks.onConnectionState(
            navigator.onLine ? 'reconnecting' : 'offline',
          );
        } else if (status === 'CLOSED' && !stopped) {
          callbacks.onConnectionState(
            navigator.onLine ? 'reconnecting' : 'offline',
          );
        }
      });

    const online = () => {
      callbacks.onConnectionState('reconnecting');
      void refresh('browser-online', true).then((synchronized) => {
        if (synchronized && !stopped) callbacks.onConnectionState('connected');
      });
    };
    const offline = () => callbacks.onConnectionState('offline');
    const visibility = () => {
      if (document.hidden) hiddenAt = Date.now();
      else if (hiddenAt && Date.now() - hiddenAt > 5_000)
        void refresh('visibility-return', true);
    };
    window.addEventListener('online', online);
    window.addEventListener('offline', offline);
    document.addEventListener('visibilitychange', visibility);

    return async () => {
      stopped = true;
      if (timer) clearTimeout(timer);
      window.removeEventListener('online', online);
      window.removeEventListener('offline', offline);
      document.removeEventListener('visibilitychange', visibility);
      await this.client.removeChannel(channel);
    };
  }
}
