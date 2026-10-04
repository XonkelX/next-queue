'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { SupabaseQueueAdapter } from '@/lib/realtime/supabase-adapter';

type SavedQueue = Awaited<
  ReturnType<SupabaseQueueAdapter['listQueues']>
>[number];
async function loadQueues() {
  return new SupabaseQueueAdapter().listQueues();
}
export function MyQueues() {
  const router = useRouter();
  const [queues, setQueues] = useState<SavedQueue[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [formError, setFormError] = useState('');
  const [slug, setSlug] = useState('');
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    let cancelled = false;
    loadQueues()
      .then((result) => {
        if (!cancelled) setQueues(result);
      })
      .catch(() => {
        if (!cancelled)
          setError(
            'Your queues could not be loaded. Check your connection and try again.',
          );
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [attempt]);
  function open(event: React.FormEvent) {
    event.preventDefault();
    setFormError('');
    let value = slug.trim();
    try {
      if (value.includes('://')) value = new URL(value).pathname;
    } catch {
      setFormError('Use a valid queue link or queue ID.');
      return;
    }
    value = value.replace(/^\/q\//, '').split('/')[0] ?? '';
    if (!/^[a-z0-9-]{1,80}$/.test(value)) {
      setFormError('Use the queue link or ID provided by your team.');
      return;
    }
    router.push(`/q/${value}/staff`);
  }
  return (
    <>
      {loading ? (
        <p role="status">Loading your queues…</p>
      ) : error ? (
        <div role="alert">
          <p>{error}</p>
          <button
            className="button button-secondary"
            onClick={() => {
              setLoading(true);
              setError('');
              setAttempt((value) => value + 1);
            }}
          >
            Try again
          </button>
        </div>
      ) : queues.length ? (
        <ul className="saved-queues">
          {queues.map((queue) => (
            <li key={queue.id}>
              <div>
                <h2>{queue.name}</h2>
                <span className="quiet-label">
                  {queue.status.toLowerCase()} ·{' '}
                  {queue.is_owner ? 'Created by you' : 'Staff access'}
                </span>
              </div>
              <Link
                className="button button-accent"
                href={`/q/${queue.slug}/staff`}
              >
                Open staff board
              </Link>
            </li>
          ))}
        </ul>
      ) : (
        <div className="empty-state">
          <h2>Your first queue starts here.</h2>
          <p>Create a queue, or open a link from your team below.</p>
          <Link className="button button-accent" href="/create">
            Create a queue
          </Link>
        </div>
      )}
      <form className="open-queue-form" onSubmit={open}>
        <h2>Open another queue</h2>
        <label htmlFor="saved-queue-link">Queue link or ID</label>
        <input
          className="text-input"
          id="saved-queue-link"
          value={slug}
          onChange={(event) => setSlug(event.target.value)}
          required
          placeholder="Paste the link from your team"
        />
        <button className="button button-secondary">Open queue</button>
        {formError && <p role="alert">{formError}</p>}
      </form>
      <p className="field-hint">
        Access is tied to this browser. On another device, use your queue link
        and staff code.
      </p>
    </>
  );
}
