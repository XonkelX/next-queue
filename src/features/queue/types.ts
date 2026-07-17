export const queueStatuses = ['OPEN', 'PAUSED', 'CLOSED'] as const;
export type QueueStatus = (typeof queueStatuses)[number];

export const entryStatuses = [
  'WAITING',
  'SERVING',
  'COMPLETED',
  'SKIPPED',
] as const;
export type QueueEntryStatus = (typeof entryStatuses)[number];

export interface Queue {
  id: string;
  slug: string;
  name: string;
  prefix: string;
  status: QueueStatus;
  createdAt: string;
  updatedAt: string;
}

export interface QueueEntry {
  id: string;
  queueId: string;
  number: number;
  displayName?: string;
  status: QueueEntryStatus;
  joinedAt: string;
  calledAt?: string;
  completedAt?: string;
  skippedAt?: string;
  updatedAt: string;
}

export interface QueueSnapshot {
  queue: Queue;
  entries: QueueEntry[];
}

export type QueueCommand =
  | { type: 'JOIN'; displayName?: string }
  | { type: 'CALL_NEXT' }
  | { type: 'COMPLETE_ACTIVE' }
  | { type: 'SKIP'; entryId: string }
  | { type: 'SET_QUEUE_STATUS'; status: QueueStatus };

export type ConnectionState = 'connected' | 'reconnecting' | 'offline';
