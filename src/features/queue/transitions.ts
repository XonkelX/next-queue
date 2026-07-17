import type {
  QueueCommand,
  QueueEntry,
  QueueEntryStatus,
  QueueSnapshot,
} from './types';

const validTransitions: Record<QueueEntryStatus, readonly QueueEntryStatus[]> =
  {
    WAITING: ['SERVING', 'SKIPPED'],
    SERVING: ['COMPLETED', 'SKIPPED'],
    COMPLETED: [],
    SKIPPED: [],
  };

export class QueueTransitionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'QueueTransitionError';
  }
}

export function canTransition(
  from: QueueEntryStatus,
  to: QueueEntryStatus,
): boolean {
  return validTransitions[from].includes(to);
}

export function waitingEntries(entries: QueueEntry[]): QueueEntry[] {
  return entries
    .filter((entry) => entry.status === 'WAITING')
    .sort(
      (a, b) => a.number - b.number || a.joinedAt.localeCompare(b.joinedAt),
    );
}

export function activeEntry(entries: QueueEntry[]): QueueEntry | undefined {
  return entries.find((entry) => entry.status === 'SERVING');
}

function transitionEntry(
  entry: QueueEntry,
  status: QueueEntryStatus,
  now: string,
): QueueEntry {
  if (!canTransition(entry.status, status)) {
    throw new QueueTransitionError(
      `${entry.status} entries cannot transition to ${status}.`,
    );
  }

  if (status === 'SERVING') {
    return { ...entry, status, calledAt: now, updatedAt: now };
  }
  if (status === 'COMPLETED') {
    return { ...entry, status, completedAt: now, updatedAt: now };
  }
  return { ...entry, status, skippedAt: now, updatedAt: now };
}

export function applyQueueCommand(
  snapshot: QueueSnapshot,
  command: QueueCommand,
  now = new Date().toISOString(),
): QueueSnapshot {
  const { queue, entries } = snapshot;

  if (command.type === 'SET_QUEUE_STATUS') {
    return {
      queue: { ...queue, status: command.status, updatedAt: now },
      entries,
    };
  }

  if (command.type === 'JOIN') {
    if (queue.status !== 'OPEN') {
      throw new QueueTransitionError(
        'This queue is not accepting new customers.',
      );
    }
    const nextNumber = Math.max(0, ...entries.map((entry) => entry.number)) + 1;
    const displayName = command.displayName?.trim();
    const entry: QueueEntry = {
      id: `entry-${String(nextNumber).padStart(3, '0')}`,
      queueId: queue.id,
      number: nextNumber,
      ...(displayName ? { displayName } : {}),
      status: 'WAITING',
      joinedAt: now,
      updatedAt: now,
    };
    return {
      queue: { ...queue, updatedAt: now },
      entries: [...entries, entry],
    };
  }

  if (command.type === 'CALL_NEXT') {
    if (queue.status !== 'OPEN') {
      throw new QueueTransitionError(
        'Open the queue before calling the next customer.',
      );
    }
    if (activeEntry(entries)) {
      throw new QueueTransitionError(
        'Complete or skip the active customer first.',
      );
    }
    const next = waitingEntries(entries)[0];
    if (!next) {
      throw new QueueTransitionError('No customers are waiting.');
    }
    return {
      queue: { ...queue, updatedAt: now },
      entries: entries.map((entry) =>
        entry.id === next.id ? transitionEntry(entry, 'SERVING', now) : entry,
      ),
    };
  }

  if (command.type === 'COMPLETE_ACTIVE') {
    const active = activeEntry(entries);
    if (!active) {
      throw new QueueTransitionError('No customer is currently being served.');
    }
    return {
      queue: { ...queue, updatedAt: now },
      entries: entries.map((entry) =>
        entry.id === active.id
          ? transitionEntry(entry, 'COMPLETED', now)
          : entry,
      ),
    };
  }

  const target = entries.find((entry) => entry.id === command.entryId);
  if (!target) {
    throw new QueueTransitionError('That queue entry no longer exists.');
  }
  return {
    queue: { ...queue, updatedAt: now },
    entries: entries.map((entry) =>
      entry.id === target.id ? transitionEntry(entry, 'SKIPPED', now) : entry,
    ),
  };
}
