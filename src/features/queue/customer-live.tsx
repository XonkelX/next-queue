'use client';

import { FormEvent, useState } from 'react';
import { InvalidQueue } from '@/components/invalid-queue';
import { QueueRecovery, QueueSyncNotice } from '@/components/queue-recovery';
import { QueueAdapterError } from '@/lib/realtime/errors';
import { CustomerTicket } from './customer-ticket';
import { activeEntry, waitingEntries } from './transitions';
import { useLiveQueue } from './use-live-queue';

export function CustomerLive({ slug }: { slug: string }) {
  const { adapter, snapshot, connection, error, commit, isNotFound, retry } =
    useLiveQueue(slug);
  const [displayName, setDisplayName] = useState('');
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState('');

  if (isNotFound) return <InvalidQueue />;
  if (!snapshot) {
    return <QueueRecovery error={error} retry={retry} />;
  }

  const ownEntry = snapshot.entries.find(
    (entry) => entry.id === snapshot.ownEntryId,
  );
  const waiting = waitingEntries(snapshot.entries);
  const active = activeEntry(snapshot.entries);
  const finished =
    ownEntry?.status === 'COMPLETED' || ownEntry?.status === 'SKIPPED';
  const position =
    ownEntry?.status === 'WAITING'
      ? waiting.findIndex((entry) => entry.id === ownEntry.id) + 1
      : 0;

  async function join(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!adapter) return;
    setPending(true);
    try {
      const next = await adapter.joinQueue(
        slug,
        displayName.trim() || undefined,
      );
      commit(next);
      setMessage(
        `You are number ${next.entries.find((entry) => entry.id === next.ownEntryId)?.numberLabel ?? ''}`,
      );
    } catch (nextError) {
      setMessage(
        nextError instanceof QueueAdapterError
          ? nextError.message
          : 'Unable to join right now.',
      );
    } finally {
      setPending(false);
    }
  }

  async function leave() {
    if (!adapter || !snapshot || !ownEntry) return;
    setPending(true);
    try {
      commit(await adapter.leaveQueue(snapshot.queue.id, ownEntry.id));
      setMessage('Your ticket has been cancelled.');
    } catch (nextError) {
      setMessage(
        nextError instanceof QueueAdapterError
          ? nextError.message
          : 'Unable to cancel. Please try again.',
      );
    } finally {
      setPending(false);
    }
  }

  const joinContent =
    snapshot.queue.status === 'OPEN' && (!ownEntry || finished) ? (
      <div className="ticket-join-copy">
        <div>
          <p className="eyebrow">Step into line</p>
          <h2 id="join-title">
            {finished ? 'Need another turn?' : 'Claim your ticket.'}
          </h2>
          <p>Add a first name if you like. Your number is all we need.</p>
        </div>
        <div>
          <form onSubmit={join} aria-busy={pending}>
            <label className="field-label" htmlFor="customer-name">
              First name <span className="quiet-label">optional</span>
            </label>
            <input
              className="text-input"
              id="customer-name"
              autoComplete="given-name"
              maxLength={30}
              value={displayName}
              onChange={(event) => setDisplayName(event.target.value)}
              disabled={pending}
            />
            <p className="field-hint">
              Only authorized staff can see this optional name.
            </p>
            <button
              className="button button-accent"
              type="submit"
              disabled={pending || connection !== 'connected'}
            >
              {pending ? 'Joining…' : 'Join the queue'}
            </button>
          </form>
        </div>
      </div>
    ) : ownEntry ? (
      <div className="ticket-saved-state" role="status">
        <div>
          <p className="eyebrow">Private by design</p>
          <h2>
            {finished ? 'This ticket has ended.' : 'Your place is saved.'}
          </h2>
        </div>
        <p>
          This ticket belongs to this browser session. No account, email, or
          phone number required.
        </p>
        {ownEntry.status === 'WAITING' && (
          <button
            className="text-button"
            disabled={pending || connection !== 'connected'}
            onClick={() => void leave()}
          >
            Cancel my ticket
          </button>
        )}
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
            ? 'Staff will reopen the queue shortly.'
            : 'Please check back during service hours.'}
        </p>
      </div>
    );

  return (
    <>
      <QueueSyncNotice connection={connection} retry={retry} />
      <p className="notice customer-feedback" role="status" aria-live="polite">
        {message}
      </p>
      <CustomerTicket
        queueName={snapshot.queue.name}
        queueStatus={snapshot.queue.status}
        prefix={snapshot.queue.prefix}
        ownEntry={ownEntry}
        activeLabel={active?.numberLabel ?? '—'}
        position={position}
        waitingCount={waiting.length}
        connection={connection}
        joinContent={joinContent}
      />
    </>
  );
}
