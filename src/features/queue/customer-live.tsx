'use client';

import { FormEvent, useState } from 'react';
import { AnimatedQueueNumber } from '@/components/animated-queue-number';
import { ConnectionIndicator } from '@/components/connection-indicator';
import { InvalidQueue } from '@/components/invalid-queue';
import { QueueStatusLabel } from '@/components/queue-status';
import { QueueAdapterError } from '@/lib/realtime/errors';
import { activeEntry, waitingEntries } from './transitions';
import { useLiveQueue } from './use-live-queue';

export function CustomerLive({ slug }: { slug: string }) {
  const { adapter, snapshot, connection, error, commit, isNotFound } =
    useLiveQueue(slug);
  const [displayName, setDisplayName] = useState('');
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState('');

  if (isNotFound) return <InvalidQueue />;
  if (!snapshot) {
    return (
      <div className="live-loading" role="status">
        {error?.message ?? 'Preparing your place in the queue…'}
      </div>
    );
  }

  const ownEntry = snapshot.entries.find(
    (entry) => entry.id === snapshot.ownEntryId,
  );
  const waiting = waitingEntries(snapshot.entries);
  const active = activeEntry(snapshot.entries);
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

  return (
    <div className="customer-layout">
      <section className="customer-panel" aria-labelledby="join-title">
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            gap: 16,
            flexWrap: 'wrap',
          }}
        >
          <p className="eyebrow">Join the queue</p>
          <ConnectionIndicator state={connection} />
        </div>
        <h2 id="join-title">Keep your place. Keep your day.</h2>
        <p className="lede">
          Add a first name if you like. Your queue number is all we need.
        </p>
        {snapshot.queue.status === 'OPEN' && !ownEntry ? (
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
              disabled={pending || connection === 'offline'}
            >
              {pending ? 'Joining…' : 'Join the queue'}
            </button>
          </form>
        ) : ownEntry ? (
          <p className="notice" role="status">
            Your place is saved to this private browser session.
          </p>
        ) : (
          <p className="notice" role="status">
            {snapshot.queue.status === 'PAUSED'
              ? 'Check-in is paused. Staff will reopen the queue shortly.'
              : 'This queue is closed.'}
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
          <AnimatedQueueNumber
            className="customer-ticket-number"
            number={ownEntry?.number}
            prefix={snapshot.queue.prefix}
          />
          <p>
            {ownEntry?.status === 'SERVING'
              ? 'It’s your turn.'
              : ownEntry
                ? 'We’ll update your position automatically.'
                : 'Join to receive your queue number.'}
          </p>
        </div>
        <div className="position-line">
          <span>
            <span className="quiet-label">Now serving</span>
            <br />
            {active?.numberLabel ?? 'No one yet'}
          </span>
          <span>
            <span className="quiet-label">Your position</span>
            <br />
            {ownEntry?.status === 'SERVING'
              ? 'Now serving'
              : position
                ? `${position} of ${waiting.length}`
                : '—'}
          </span>
        </div>
      </section>
    </div>
  );
}
