'use client';

import { AnimatedQueueNumber } from '@/components/animated-queue-number';
import { ConnectionIndicator } from '@/components/connection-indicator';
import { InvalidQueue } from '@/components/invalid-queue';
import { activeEntry, waitingEntries } from './transitions';
import { useLiveQueue } from './use-live-queue';

export function PublicDisplayLive({ slug }: { slug: string }) {
  const { snapshot, connection, error, isNotFound } = useLiveQueue(slug);
  if (isNotFound) return <InvalidQueue />;
  if (!snapshot)
    return (
      <main id="main-content" className="display-page">
        <div className="live-loading" role="status">
          {error?.message ?? 'Connecting to the queue…'}
        </div>
      </main>
    );
  const active = activeEntry(snapshot.entries);
  const upcoming = waitingEntries(snapshot.entries).slice(0, 3);
  return (
    <main id="main-content" className="display-page">
      <header className="display-top">
        <div>
          <p className="eyebrow">Welcome</p>
          <h1>{snapshot.queue.name}</h1>
        </div>
        <ConnectionIndicator state={connection} />
      </header>
      <section className="display-active" aria-labelledby="now-serving-label">
        <div>
          <p className="eyebrow" id="now-serving-label">
            Now serving
          </p>
          <AnimatedQueueNumber
            className="display-active-number"
            number={active?.number}
            prefix={snapshot.queue.prefix}
          />
          <p className="sr-only" aria-live="polite">
            {active
              ? `Now serving ${active.numberLabel}`
              : 'No one is currently being served'}
          </p>
        </div>
      </section>
      <section className="display-up-next" aria-labelledby="up-next-title">
        <p className="quiet-label" id="up-next-title">
          Up next
        </p>
        <div className="next-numbers">
          {upcoming.length ? (
            upcoming.map((entry) => (
              <span className="queue-number" key={entry.id}>
                {entry.numberLabel}
              </span>
            ))
          ) : (
            <span>Queue is clear</span>
          )}
        </div>
      </section>
    </main>
  );
}
