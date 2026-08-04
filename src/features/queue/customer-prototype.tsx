'use client';

import { FormEvent, useState, useSyncExternalStore } from 'react';
import { CustomerTicket } from './customer-ticket';
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

  const joinContent = joinedEntry ? (
    <div className="ticket-saved-state" role="status">
      <div>
        <p className="eyebrow">Private by design</p>
        <h2>Your place is saved.</h2>
      </div>
      <p>
        This ticket belongs to this browser session. No account, email, or phone
        number required.
      </p>
      <button className="button button-accent" type="button" disabled>
        You’re in the queue
      </button>
    </div>
  ) : snapshot.queue.status === 'OPEN' ? (
    <div className="ticket-join-copy">
      <div>
        <p className="eyebrow">Step into line</p>
        <h2 id="join-title">Claim your ticket.</h2>
        <p>Add a first name if you like. Your number is all we need.</p>
      </div>
      <div>
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
      </div>
    </div>
  ) : (
    <div className="ticket-saved-state" role="status">
      <div>
        <p className="eyebrow">Check-in unavailable</p>
        <h2>
          {snapshot.queue.status === 'PAUSED'
            ? 'The line is taking a breather.'
            : 'Service has ended for now.'}
        </h2>
      </div>
      <p>
        {snapshot.queue.status === 'PAUSED'
          ? 'Check-in is paused. Staff will reopen the queue shortly.'
          : 'This queue is closed. Please check back during service hours.'}
      </p>
    </div>
  );

  return (
    <>
      <CustomerTicket
        queueName={snapshot.queue.name}
        queueStatus={snapshot.queue.status}
        prefix={snapshot.queue.prefix}
        ownEntry={joinedEntry}
        activeLabel={
          active ? formatQueueNumber(active.number, snapshot.queue.prefix) : '—'
        }
        position={position}
        waitingCount={waiting.length}
        connection="connected"
        announceConnection={false}
        joinContent={joinContent}
      />
      <p className="sr-only" aria-live="polite">
        {message}
      </p>
    </>
  );
}
