import { beforeEach, describe, expect, it } from 'vitest';
import { createInitialQueueSnapshot } from './mock-data';
import {
  activeEntry,
  applyQueueCommand,
  canTransition,
  QueueTransitionError,
  waitingEntries,
} from './transitions';
import type { QueueSnapshot } from './types';

const now = '2026-07-17T15:00:00.000Z';
let snapshot: QueueSnapshot;

beforeEach(() => {
  snapshot = createInitialQueueSnapshot();
});

describe('queue state transitions', () => {
  it('allows only the four specified state transitions', () => {
    expect(canTransition('WAITING', 'SERVING')).toBe(true);
    expect(canTransition('WAITING', 'SKIPPED')).toBe(true);
    expect(canTransition('SERVING', 'COMPLETED')).toBe(true);
    expect(canTransition('SERVING', 'SKIPPED')).toBe(true);
    expect(canTransition('COMPLETED', 'WAITING')).toBe(false);
    expect(canTransition('SKIPPED', 'SERVING')).toBe(false);
  });

  it('prevents a second active customer', () => {
    expect(() =>
      applyQueueCommand(snapshot, { type: 'CALL_NEXT' }, now),
    ).toThrow('Complete or skip the active customer first.');
  });

  it('completes the active customer and records the time', () => {
    const next = applyQueueCommand(snapshot, { type: 'COMPLETE_ACTIVE' }, now);
    expect(activeEntry(next.entries)).toBeUndefined();
    expect(
      next.entries.find((entry) => entry.id === 'entry-024'),
    ).toMatchObject({
      status: 'COMPLETED',
      completedAt: now,
    });
  });

  it('skips waiting and serving entries without renumbering', () => {
    const servingSkipped = applyQueueCommand(
      snapshot,
      { type: 'SKIP', entryId: 'entry-024' },
      now,
    );
    const waitingSkipped = applyQueueCommand(
      servingSkipped,
      { type: 'SKIP', entryId: 'entry-26' },
      now,
    );
    expect(
      waitingSkipped.entries.find((entry) => entry.id === 'entry-024')?.status,
    ).toBe('SKIPPED');
    expect(
      waitingSkipped.entries.find((entry) => entry.id === 'entry-26')?.status,
    ).toBe('SKIPPED');
    expect(
      waitingEntries(waitingSkipped.entries).map((entry) => entry.number),
    ).toEqual([25, 27, 28]);
  });

  it('calls the earliest waiting number deterministically', () => {
    const clear = applyQueueCommand(snapshot, { type: 'COMPLETE_ACTIVE' }, now);
    const called = applyQueueCommand(clear, { type: 'CALL_NEXT' }, now);
    expect(activeEntry(called.entries)?.number).toBe(25);
  });

  it('reports an empty queue without changing state', () => {
    const empty = {
      queue: snapshot.queue,
      entries: snapshot.entries.map((entry) => ({
        ...entry,
        status: 'COMPLETED' as const,
      })),
    };
    expect(() => applyQueueCommand(empty, { type: 'CALL_NEXT' }, now)).toThrow(
      new QueueTransitionError('No customers are waiting.'),
    );
  });

  it('keeps numbers unique and monotonically increasing on join', () => {
    const joined = applyQueueCommand(
      snapshot,
      { type: 'JOIN', displayName: '  Ren  ' },
      now,
    );
    const newest = joined.entries.at(-1);
    expect(newest).toMatchObject({
      number: 29,
      displayName: 'Ren',
      status: 'WAITING',
    });
    expect(new Set(joined.entries.map((entry) => entry.number)).size).toBe(
      joined.entries.length,
    );
  });

  it('does not allow joining a paused or closed queue', () => {
    for (const status of ['PAUSED', 'CLOSED'] as const) {
      const unavailable = applyQueueCommand(
        snapshot,
        { type: 'SET_QUEUE_STATUS', status },
        now,
      );
      expect(() =>
        applyQueueCommand(unavailable, { type: 'JOIN' }, now),
      ).toThrow(/not accepting/i);
    }
  });
});
