'use client';

import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import {
  CheckCircle2,
  Megaphone,
  Pause,
  Play,
  SkipForward,
  XCircle,
} from 'lucide-react';
import { FormEvent, useRef, useState } from 'react';
import { AnimatedQueueNumber } from '@/components/animated-queue-number';
import { InvalidQueue } from '@/components/invalid-queue';
import { QueueSurfaceHeader } from '@/components/queue-surface-header';
import { QueueAdapterError } from '@/lib/realtime/errors';
import { activeEntry, waitingEntries } from './transitions';
import { useLiveQueue } from './use-live-queue';
import type { QueueSnapshot } from './types';

const joinedTime = new Intl.DateTimeFormat('en-US', {
  hour: 'numeric',
  minute: '2-digit',
});

export function StaffLive({ slug }: { slug: string }) {
  const { adapter, snapshot, connection, error, commit, isNotFound } =
    useLiveQueue(slug);
  const [accessCode, setAccessCode] = useState('');
  const [pending, setPending] = useState('');
  const [message, setMessage] = useState('Ready.');
  const messageRef = useRef<HTMLParagraphElement>(null);
  const reduced = useReducedMotion();

  if (isNotFound) return <InvalidQueue />;
  if (!snapshot)
    return (
      <div className="live-loading" role="status">
        {error?.message ?? 'Preparing the staff board…'}
      </div>
    );

  async function claim(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!adapter) return;
    const normalizedAccessCode = accessCode.trim().toUpperCase();
    if (!normalizedAccessCode) {
      setMessage('Enter the access code for this queue.');
      return;
    }
    setPending('claim');
    try {
      const next = await adapter.claimStaffAccess(slug, normalizedAccessCode);
      setAccessCode('');
      commit(next);
      setMessage('Staff access confirmed.');
    } catch (nextError) {
      setMessage(
        nextError instanceof QueueAdapterError
          ? nextError.message
          : 'That access code could not be verified.',
      );
    } finally {
      setPending('');
    }
  }

  if (snapshot.role !== 'staff') {
    return (
      <div className="ticket-experience staff-experience">
        <QueueSurfaceHeader
          queueName={snapshot.queue.name}
          surface="Staff board"
          status={snapshot.queue.status}
          connection={connection}
        />
        <section className="setup-panel" aria-labelledby="staff-access-title">
          <p className="eyebrow">Staff access</p>
          <h2 id="staff-access-title">Enter the queue access code.</h2>
          <p>
            The code grants control of this queue. It is never placed in the URL
            or saved by this interface.
          </p>
          <form
            className="setup-form"
            onSubmit={claim}
            aria-busy={pending === 'claim'}
          >
            <label className="field-label" htmlFor="staff-code">
              Private access code
            </label>
            <input
              className="text-input"
              id="staff-code"
              type="password"
              autoComplete="off"
              autoCapitalize="characters"
              spellCheck={false}
              aria-describedby="staff-access-message"
              value={accessCode}
              onChange={(event) => setAccessCode(event.target.value)}
              required
              disabled={pending === 'claim'}
            />
            <button
              className="button button-accent"
              type="submit"
              disabled={pending === 'claim' || connection === 'offline'}
            >
              {pending === 'claim' ? 'Checking…' : 'Open staff board'}
            </button>
          </form>
          <p
            className="notice"
            id="staff-access-message"
            role="status"
            aria-live="polite"
          >
            {message}
          </p>
        </section>
      </div>
    );
  }

  const active = activeEntry(snapshot.entries);
  const waiting = waitingEntries(snapshot.entries);

  async function command(
    label: string,
    action: () => Promise<QueueSnapshot>,
    success: string,
  ) {
    setPending(label);
    try {
      commit(await action());
      setMessage(success);
      requestAnimationFrame(() => messageRef.current?.focus());
    } catch (nextError) {
      setMessage(
        nextError instanceof QueueAdapterError
          ? nextError.message
          : 'The queue could not be updated.',
      );
    } finally {
      setPending('');
    }
  }

  return (
    <div className="ticket-experience staff-experience">
      <QueueSurfaceHeader
        queueName={snapshot.queue.name}
        surface="Staff board"
        status={snapshot.queue.status}
        connection={connection}
      />
      <div className="staff-layout">
        <section className="staff-active" aria-labelledby="active-title">
          <div className="staff-ticket-stub" aria-hidden="true">
            <span>Now serving</span>
            <span>↓</span>
          </div>
          <div className="staff-ticket-body">
            <div>
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
          </div>
          <span
            className="staff-ticket-cut staff-ticket-cut-left"
            aria-hidden
          />
          <span
            className="staff-ticket-cut staff-ticket-cut-right"
            aria-hidden
          />
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
                    <span className="queue-number">{entry.numberLabel}</span>
                    <span className="waiting-person">
                      <strong>{entry.displayName ?? 'Guest'}</strong>
                      <time dateTime={entry.joinedAt}>
                        Joined {joinedTime.format(new Date(entry.joinedAt))}
                      </time>
                    </span>
                    <button
                      className="text-button waiting-skip"
                      type="button"
                      disabled={Boolean(pending)}
                      aria-label={`Skip ${entry.numberLabel}`}
                      onClick={() =>
                        adapter &&
                        void command(
                          `skip-${entry.id}`,
                          () => adapter.skipEntry(snapshot.queue.id, entry.id),
                          `${entry.numberLabel} skipped.`,
                        )
                      }
                    >
                      <SkipForward aria-hidden="true" />
                      Skip
                    </button>
                  </motion.li>
                ))}
              </AnimatePresence>
            </ol>
          ) : (
            <p className="empty-state">
              No customers waiting. New arrivals will appear here automatically.
            </p>
          )}
        </section>

        <footer className="staff-command-bar">
          <div className="staff-actions" aria-busy={Boolean(pending)}>
            {active ? (
              <>
                <button
                  className="button button-accent"
                  type="button"
                  disabled={Boolean(pending)}
                  onClick={() =>
                    adapter &&
                    void command(
                      'complete',
                      () => adapter.completeCurrent(snapshot.queue.id),
                      `${active.numberLabel} completed.`,
                    )
                  }
                >
                  <CheckCircle2 aria-hidden="true" />
                  Complete
                </button>
                <button
                  className="button button-secondary"
                  type="button"
                  disabled={Boolean(pending)}
                  onClick={() =>
                    adapter &&
                    void command(
                      'skip-active',
                      () => adapter.skipEntry(snapshot.queue.id, active.id),
                      `${active.numberLabel} skipped.`,
                    )
                  }
                >
                  <SkipForward aria-hidden="true" />
                  Skip
                </button>
              </>
            ) : (
              <button
                className="button button-accent"
                type="button"
                disabled={
                  Boolean(pending) ||
                  !waiting.length ||
                  snapshot.queue.status !== 'OPEN'
                }
                onClick={() =>
                  adapter &&
                  void command(
                    'call',
                    () => adapter.callNext(snapshot.queue.id),
                    'Next customer called.',
                  )
                }
              >
                <Megaphone aria-hidden="true" />
                Call next
              </button>
            )}
            {snapshot.queue.status === 'OPEN' && (
              <button
                className="button button-secondary"
                type="button"
                disabled={Boolean(pending)}
                onClick={() =>
                  adapter &&
                  void command(
                    'pause',
                    () => adapter.pauseQueue(snapshot.queue.id),
                    'Queue paused.',
                  )
                }
              >
                <Pause aria-hidden="true" />
                Pause queue
              </button>
            )}
            {snapshot.queue.status === 'PAUSED' && (
              <button
                className="button button-secondary"
                type="button"
                disabled={Boolean(pending)}
                onClick={() =>
                  adapter &&
                  void command(
                    'reopen',
                    () => adapter.reopenQueue(snapshot.queue.id),
                    'Queue reopened.',
                  )
                }
              >
                <Play aria-hidden="true" />
                Open queue
              </button>
            )}
            {snapshot.queue.status !== 'CLOSED' && (
              <button
                className="text-button"
                type="button"
                disabled={Boolean(pending)}
                onClick={() =>
                  adapter &&
                  void command(
                    'close',
                    () => adapter.closeQueue(snapshot.queue.id),
                    'Queue closed.',
                  )
                }
              >
                <XCircle aria-hidden="true" />
                Close queue
              </button>
            )}
          </div>
          <p
            className="notice"
            ref={messageRef}
            tabIndex={-1}
            role="status"
            aria-live="polite"
          >
            {pending ? 'Updating the queue…' : message}
          </p>
        </footer>
      </div>
    </div>
  );
}
