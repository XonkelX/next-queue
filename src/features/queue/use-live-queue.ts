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
  const [connection, setConnection] = useState<ConnectionState>('connecting');
  const [error, setError] = useState<Error | undefined>(
    'error' in adapterResult ? adapterResult.error : undefined,
  );

  const commit = useCallback((next: QueueSnapshot) => {
    setSnapshot((current) =>
      !current || next.queue.revision >= current.queue.revision
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
        onSnapshot: commit,
        onConnectionState: setConnection,
        onError: (nextError) => setError(nextError),
      })
      .then((cleanup) => {
        if (cancelled) void cleanup();
        else unsubscribe = cleanup;
      })
      .catch((nextError: unknown) => {
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
  }, [adapterResult, commit, slug]);

  return {
    adapter: 'adapter' in adapterResult ? adapterResult.adapter : undefined,
    snapshot,
    connection,
    error,
    commit,
    clearError: () => setError(undefined),
    isNotFound:
      error instanceof QueueAdapterError && error.code === 'QUEUE_NOT_FOUND',
  };
}
