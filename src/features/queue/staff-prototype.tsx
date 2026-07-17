'use client';

import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { useState } from 'react';
import { AnimatedQueueNumber } from '@/components/animated-queue-number';
import { ConnectionIndicator } from '@/components/connection-indicator';
import { QueueStatusLabel } from '@/components/queue-status';
import { formatQueueNumber } from './format';
import { createInitialQueueSnapshot } from './mock-data';
import {
  activeEntry,
  applyQueueCommand,
  QueueTransitionError,
  waitingEntries,
} from './transitions';
import type { QueueCommand, QueueSnapshot } from './types';

export function StaffPrototype({
  initialSnapshot,
}: {
  initialSnapshot?: QueueSnapshot;
}) {
  const [snapshot, setSnapshot] = useState(
    () => initialSnapshot ?? createInitialQueueSnapshot(),
  );
  const [message, setMessage] = useState('Ready.');
  const reduced = useReducedMotion();
  const active = activeEntry(snapshot.entries);
  const waiting = waitingEntries(snapshot.entries);

  function run(command: QueueCommand, success: string) {
    try {
      setSnapshot((current) => applyQueueCommand(current, command));
      setMessage(success);
    } catch (error) {
      setMessage(
        error instanceof QueueTransitionError
          ? error.message
          : 'The queue could not be updated.',
      );
    }
  }

  const toggleStatus = () => {
    const opening = snapshot.queue.status !== 'OPEN';
    run(
      { type: 'SET_QUEUE_STATUS', status: opening ? 'OPEN' : 'PAUSED' },
      opening ? 'Queue reopened.' : 'Queue paused.',
    );
  };

  return (
    <div className="staff-layout">
      <section className="staff-active" aria-labelledby="active-title">
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            gap: 16,
            flexWrap: 'wrap',
          }}
        >
          <QueueStatusLabel status={snapshot.queue.status} />
          <ConnectionIndicator state="connected" />
        </div>
        <div style={{ marginTop: 52 }}>
          <p className="eyebrow">Now serving</p>
          <h2 id="active-title">
            {active?.displayName ??
              (active ? 'Current customer' : 'No one yet')}
          </h2>
        </div>
        <AnimatedQueueNumber
          className="staff-active-number"
          number={active?.number}
          prefix={snapshot.queue.prefix}
        />
        <div className="staff-actions">
          {active ? (
            <>
              <button
                className="button button-accent"
                type="button"
                onClick={() =>
                  run(
                    { type: 'COMPLETE_ACTIVE' },
                    `${formatQueueNumber(active.number, snapshot.queue.prefix)} completed.`,
                  )
                }
              >
                Complete
              </button>
              <button
                className="button button-secondary"
                type="button"
                onClick={() =>
                  run(
                    { type: 'SKIP', entryId: active.id },
                    `${formatQueueNumber(active.number, snapshot.queue.prefix)} skipped.`,
                  )
                }
              >
                Skip
              </button>
            </>
          ) : (
            <button
              className="button button-accent"
              type="button"
              disabled={!waiting.length || snapshot.queue.status !== 'OPEN'}
              onClick={() =>
                run({ type: 'CALL_NEXT' }, 'Next customer called.')
              }
            >
              Call next
            </button>
          )}
          <button
            className="button button-secondary"
            type="button"
            onClick={toggleStatus}
          >
            {snapshot.queue.status === 'OPEN' ? 'Pause queue' : 'Open queue'}
          </button>
        </div>
        <p className="notice" role="status" aria-live="polite">
          {message}
        </p>
      </section>

      <section className="waiting-panel" aria-labelledby="waiting-title">
        <div className="waiting-heading">
          <h2 id="waiting-title">Waiting</h2>
          <span className="quiet-label">
            {waiting.length} {waiting.length === 1 ? 'person' : 'people'}
          </span>
        </div>
        {waiting.length ? (
          <ol className="waiting-list">
            <AnimatePresence initial={false}>
              {waiting.map((entry) => (
                <motion.li
                  className="waiting-entry"
                  key={entry.id}
                  layout={!reduced}
                  initial={{ opacity: 0, y: reduced ? 0 : 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, height: 0 }}
                >
                  <span className="queue-number">
                    {formatQueueNumber(entry.number, snapshot.queue.prefix)}
                  </span>
                  <span>{entry.displayName ?? 'Guest'}</span>
                  <button
                    className="text-button"
                    type="button"
                    aria-label={`Skip ${formatQueueNumber(entry.number, snapshot.queue.prefix)}`}
                    onClick={() =>
                      run(
                        { type: 'SKIP', entryId: entry.id },
                        `${formatQueueNumber(entry.number, snapshot.queue.prefix)} skipped.`,
                      )
                    }
                  >
                    Skip
                  </button>
                </motion.li>
              ))}
            </AnimatePresence>
          </ol>
        ) : (
          <p className="empty-state">
            No customers waiting. New arrivals will appear here.
          </p>
        )}
      </section>
    </div>
  );
}
