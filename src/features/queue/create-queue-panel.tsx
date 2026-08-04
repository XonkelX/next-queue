'use client';

import { FormEvent, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { SupabaseQueueAdapter } from '@/lib/realtime/supabase-adapter';
import { QueueAdapterError } from '@/lib/realtime/errors';

export function CreateQueuePanel() {
  const adapter = useMemo(() => {
    try {
      return new SupabaseQueueAdapter();
    } catch {
      return undefined;
    }
  }, []);
  const [name, setName] = useState('North Star Café');
  const [prefix, setPrefix] = useState('A');
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState('');
  const [created, setCreated] = useState<{ slug: string; code: string }>();
  const codeRef = useRef<HTMLInputElement>(null);

  async function create(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!adapter) {
      setMessage(
        'Supabase is not configured. Follow the README local setup first.',
      );
      return;
    }
    setPending(true);
    try {
      const result = await adapter.createQueue(name, prefix);
      if (!result.accessCode)
        throw new Error('The one-time access code was not returned.');
      setCreated({ slug: result.snapshot.queue.slug, code: result.accessCode });
      setMessage(
        'Queue created. Save the staff code now; it cannot be shown again.',
      );
    } catch (error) {
      setMessage(
        error instanceof QueueAdapterError
          ? error.message
          : 'The queue could not be created.',
      );
    } finally {
      setPending(false);
    }
  }

  async function copyCode() {
    if (!created) return;
    try {
      await navigator.clipboard.writeText(created.code);
      setMessage('Staff code copied.');
    } catch {
      codeRef.current?.select();
      setMessage('Select and copy the highlighted code manually.');
    }
  }

  return (
    <section className="setup-panel" aria-labelledby="create-queue-title">
      <div className="setup-ticket-stub" aria-hidden="true">
        <span>Your queue</span>
        <span>↓</span>
      </div>
      <div className="setup-panel-content">
        <p className="eyebrow">Start your service</p>
        <h2 id="create-queue-title">Issue your queue.</h2>
        <p className="setup-panel-intro">
          One setup creates the customer ticket, staff board, and public
          display—all synchronized in real time.
        </p>
        <form className="setup-form" onSubmit={create} aria-busy={pending}>
          <label className="field-label" htmlFor="queue-name">
            Venue or queue name
          </label>
          <input
            className="text-input"
            id="queue-name"
            maxLength={80}
            value={name}
            onChange={(event) => setName(event.target.value)}
            required
            disabled={pending}
          />
          <label className="field-label" htmlFor="queue-prefix">
            Ticket prefix
          </label>
          <input
            className="text-input"
            id="queue-prefix"
            maxLength={3}
            pattern="[A-Za-z]{1,3}"
            value={prefix}
            onChange={(event) => setPrefix(event.target.value)}
            required
            disabled={pending}
          />
          <button
            className="button button-accent"
            type="submit"
            disabled={pending}
          >
            {pending ? 'Creating…' : 'Create my queue'}
          </button>
        </form>
        <p className="notice" role="status" aria-live="polite">
          {message ||
            'Private browser session. No account or contact information required.'}
        </p>
        {!created && (
          <div className="setup-deliverables" aria-label="Included queue views">
            <p className="eyebrow">Ready in one setup</p>
            <ul>
              <li>
                <span>01</span>
                <div>
                  <strong>Customer ticket</strong>
                  <small>Private number and live position</small>
                </div>
              </li>
              <li>
                <span>02</span>
                <div>
                  <strong>Staff board</strong>
                  <small>One focused operational view</small>
                </div>
              </li>
              <li>
                <span>03</span>
                <div>
                  <strong>Public display</strong>
                  <small>Now serving and up-next visibility</small>
                </div>
              </li>
            </ul>
          </div>
        )}
        {created && (
          <div className="code-reveal">
            <strong>One-time staff access code</strong>
            <p>
              Anyone with this code can control the queue. Save it privately
              now.
            </p>
            <input
              ref={codeRef}
              className="text-input"
              aria-label="One-time staff access code"
              readOnly
              value={created.code}
              onFocus={(event) => event.currentTarget.select()}
            />
            <button
              className="button button-secondary"
              type="button"
              onClick={() => void copyCode()}
            >
              Copy code
            </button>
            <p className="field-hint">
              Queue slug: <code>{created.slug}</code>. This staff code only
              works with this queue.
            </p>
            <div className="created-queue-actions">
              <Link
                className="button button-accent"
                href={`/q/${created.slug}/staff`}
              >
                Open your staff board
              </Link>
              <Link
                className="button button-secondary"
                href={`/q/${created.slug}`}
              >
                Open your customer view
              </Link>
              <Link
                className="button button-secondary"
                href={`/q/${created.slug}/display`}
              >
                Open your public display
              </Link>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
