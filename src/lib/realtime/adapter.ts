import type {
  ConnectionState,
  QueueCommand,
  QueueSnapshot,
} from '@/features/queue/types';

export interface QueueRealtimeAdapter {
  connect(): Promise<void>;
  disconnect(): Promise<void>;
  subscribe(
    queueId: string,
    onSnapshot: (snapshot: QueueSnapshot) => void,
  ): () => void;
  publish(queueId: string, command: QueueCommand): Promise<void>;
  observeConnectionState(
    listener: (state: ConnectionState) => void,
  ): () => void;
}

/**
 * Story 1 boundary. A persistent multi-client adapter will implement this
 * contract in the next engineering story; no mock is presented as production.
 */
export const REALTIME_IMPLEMENTATION_STATUS = 'visual-prototype-only' as const;
