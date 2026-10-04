'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import type { ConnectionState, QueueSnapshot } from './types';
import { QueueAdapterError } from '@/lib/realtime/errors';
import { SupabaseQueueAdapter } from '@/lib/realtime/supabase-adapter';

export function useLiveQueue(slug: string) {
  const adapterResult = useMemo(() => {
    try {
      return { adapter: new SupabaseQueueAdapter() } as const;
    } catch (error) {
      return {
        error:
          error instanceof Error
            ? error
            : new Error('Supabase configuration is unavailable.'),
      } as const;
    }
  }, []);
  const [snapshot, setSnapshot] = useState<QueueSnapshot>();
  const [attempt, setAttempt] = useState(0);
  const [connection, setConnection] = useState<ConnectionState>('connecting');
  const [error, setError] = useState<Error | undefined>(
    'error' in adapterResult ? adapterResult.error : undefined,
  );

  const commit = useCallback((next: QueueSnapshot) => {
    setError(undefined);
    setSnapshot((current) =>
      !current ||
      current.queue.id !== next.queue.id ||
      next.queue.revision >= current.queue.revision
        ? next
        : current,
    );
  }, []);

  useEffect(() => {
    if (!('adapter' in adapterResult)) return;
    let unsubscribe: (() => Promise<void>) | undefined;
    let cancelled = false;
    adapterResult.adapter
      .subscribe(slug, {
        onSnapshot: (next) => {
          if (!cancelled) commit(next);
        },
        onConnectionState: (state) => {
          if (!cancelled) setConnection(state);
        },
        onError: (nextError) => {
          if (!cancelled) setError(nextError);
        },
      })
      .then((cleanup) => {
        if (cancelled) void cleanup();
        else unsubscribe = cleanup;
      })
      .catch((nextError: unknown) => {
        if (cancelled) return;
        setConnection('error');
        setError(
          nextError instanceof Error
            ? nextError
            : new Error('Unable to connect to this queue.'),
        );
      });
    return () => {
      cancelled = true;
      if (unsubscribe) void unsubscribe();
    };
  }, [adapterResult, commit, slug, attempt]);

  return {
    adapter: 'adapter' in adapterResult ? adapterResult.adapter : undefined,
    snapshot,
    connection,
    error,
    commit,
    clearError: () => setError(undefined),
    retry: () => {
      setError(undefined);
      setConnection('connecting');
      setAttempt((value) => value + 1);
    },
    isNotFound:
      error instanceof QueueAdapterError && error.code === 'QUEUE_NOT_FOUND',
  };
}
