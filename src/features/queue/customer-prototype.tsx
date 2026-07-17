'use client';

import { FormEvent, useState, useSyncExternalStore } from 'react';
import { AnimatedQueueNumber } from '@/components/animated-queue-number';
import { QueueStatusLabel } from '@/components/queue-status';
import { formatQueueNumber } from './format';
import { createInitialQueueSnapshot } from './mock-data';
import { activeEntry, applyQueueCommand, waitingEntries } from './transitions';
import type { QueueEntry, QueueSnapshot } from './types';

const sessionKey = 'next-demo-customer-entry';
const sessionEvent = 'next-demo-session-change';

function subscribeToSession(listener: () => void) {
  window.addEventListener('storage', listener);
  window.addEventListener(sessionEvent, listener);
  return () => {
    window.removeEventListener('storage', listener);
    window.removeEventListener(sessionEvent, listener);
  };
}

function getSessionEntryId() {
  return window.sessionStorage.getItem(sessionKey) ?? '';
}

export function CustomerPrototype({
  initialSnapshot,
}: {
  initialSnapshot?: QueueSnapshot;
}) {
  const [snapshot, setSnapshot] = useState(
    () => initialSnapshot ?? createInitialQueueSnapshot(),
  );
  const [displayName, setDisplayName] = useState('');
  const [message, setMessage] = useState('');
  const joinedEntryId = useSyncExternalStore(
    subscribeToSession,
    getSessionEntryId,
    () => '',
  );
  const joinedEntry: QueueEntry | undefined = snapshot.entries.find(
    (candidate) => candidate.id === joinedEntryId,
  );

  function handleJoin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    try {
      const nextSnapshot = applyQueueCommand(snapshot, {
        type: 'JOIN',
        ...(displayName.trim() ? { displayName } : {}),
      });
      const entry = nextSnapshot.entries.at(-1);
      if (!entry) return;
      setSnapshot(nextSnapshot);
      setMessage(
        `You are number ${formatQueueNumber(entry.number, snapshot.queue.prefix)}`,
      );
      window.sessionStorage.setItem(sessionKey, entry.id);
      window.dispatchEvent(new Event(sessionEvent));
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : 'Unable to join this queue.',
      );
    }
  }

  const active = activeEntry(snapshot.entries);
  const waiting = waitingEntries(snapshot.entries);
  const position = joinedEntry
    ? waiting.findIndex((entry) => entry.id === joinedEntry.id) + 1
    : 0;

  return (
    <div className="customer-layout">
      <section className="customer-panel" aria-labelledby="join-title">
        <p className="eyebrow">Join the queue</p>
        <h2 id="join-title">Keep your place. Keep your day.</h2>
        <p className="lede">
          Add a first name if you like. Your queue number is all we need.
        </p>
        {snapshot.queue.status === 'OPEN' ? (
          <form onSubmit={handleJoin}>
            <label className="field-label" htmlFor="customer-name">
              First name <span className="quiet-label">optional</span>
            </label>
            <input
              className="text-input"
              id="customer-name"
              name="displayName"
              autoComplete="given-name"
              maxLength={30}
              value={displayName}
              onChange={(event) => setDisplayName(event.target.value)}
              disabled={Boolean(joinedEntry)}
            />
            <p className="field-hint">
              Only your first name is used on the staff view.
            </p>
            <button
              className="button button-accent"
              type="submit"
              disabled={Boolean(joinedEntry)}
            >
              {joinedEntry ? 'You’re in the queue' : 'Join the queue'}
            </button>
          </form>
        ) : (
          <p className="notice" role="status">
            {snapshot.queue.status === 'PAUSED'
              ? 'Check-in is paused. Staff will reopen the queue shortly.'
              : 'This queue is closed. Please check back during service hours.'}
          </p>
        )}
        <p className="sr-only" aria-live="polite">
          {message}
        </p>
      </section>

      <section
        className="customer-panel customer-status-panel"
        aria-labelledby="your-place-title"
      >
        <div>
          <QueueStatusLabel status={snapshot.queue.status} />
          <p
            className="quiet-label"
            id="your-place-title"
            style={{ marginTop: 42 }}
          >
            Your number
          </p>
          {joinedEntry ? (
            <AnimatedQueueNumber
              className="customer-ticket-number"
              number={joinedEntry.number}
              prefix={snapshot.queue.prefix}
            />
          ) : (
            <span
              className="queue-number customer-ticket-number"
              aria-label="Not joined"
            >
              —
            </span>
          )}
          <p>
            {joinedEntry
              ? 'We’ll keep your position in this browser session.'
              : 'Join to receive your queue number.'}
          </p>
        </div>
        <div className="position-line">
          <span>
            <span className="quiet-label">Now serving</span>
            <br />
            {active
              ? formatQueueNumber(active.number, snapshot.queue.prefix)
              : 'No one yet'}
          </span>
          <span>
            <span className="quiet-label">Your position</span>
            <br />
            {joinedEntry ? `${position} of ${waiting.length}` : '—'}
          </span>
        </div>
      </section>
    </div>
  );
}
