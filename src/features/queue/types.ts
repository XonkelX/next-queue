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
  revision: number;
  createdAt: string;
  updatedAt: string;
}

export interface QueueEntry {
  id: string;
  queueId: string;
  number: number;
  numberLabel?: string | undefined;
  displayName?: string | undefined;
  status: QueueEntryStatus;
  revision: number;
  joinedAt: string;
  calledAt?: string | undefined;
  completedAt?: string | undefined;
  skippedAt?: string | undefined;
  updatedAt: string;
}

export interface QueueSnapshot {
  queue: Queue;
  entries: QueueEntry[];
  role?: 'public' | 'customer' | 'staff';
  ownEntryId?: string;
  waitingCount?: number;
  serverTime?: string;
}

export type QueueCommand =
  | { type: 'JOIN'; displayName?: string }
  | { type: 'CALL_NEXT' }
  | { type: 'COMPLETE_ACTIVE' }
  | { type: 'SKIP'; entryId: string }
  | { type: 'SET_QUEUE_STATUS'; status: QueueStatus };

export type ConnectionState =
  'connecting' | 'connected' | 'reconnecting' | 'offline' | 'error';
