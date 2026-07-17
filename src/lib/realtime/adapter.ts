import type { ConnectionState, QueueSnapshot } from '@/features/queue/types';

export interface QueueCreationResult {
  snapshot: QueueSnapshot;
  accessCode?: string;
}

export interface QueueSubscriptionCallbacks {
  onSnapshot(snapshot: QueueSnapshot): void;
  onConnectionState(state: ConnectionState): void;
  onError(error: Error): void;
}

export interface QueueRealtimeAdapter {
  getSnapshot(slug: string): Promise<QueueSnapshot>;
  subscribe(
    slug: string,
    callbacks: QueueSubscriptionCallbacks,
  ): Promise<() => Promise<void>>;
  createQueue(name: string, prefix: string): Promise<QueueCreationResult>;
  claimStaffAccess(slug: string, accessCode: string): Promise<QueueSnapshot>;
  joinQueue(slug: string, displayName?: string): Promise<QueueSnapshot>;
  callNext(queueId: string): Promise<QueueSnapshot>;
  completeCurrent(queueId: string): Promise<QueueSnapshot>;
  skipEntry(queueId: string, entryId: string): Promise<QueueSnapshot>;
  pauseQueue(queueId: string): Promise<QueueSnapshot>;
  reopenQueue(queueId: string): Promise<QueueSnapshot>;
  closeQueue(queueId: string): Promise<QueueSnapshot>;
}

export const REALTIME_IMPLEMENTATION_STATUS = 'supabase-persistent' as const;
