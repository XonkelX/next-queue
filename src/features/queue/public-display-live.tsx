'use client';

import { AnimatedQueueNumber } from '@/components/animated-queue-number';
import { ConnectionIndicator } from '@/components/connection-indicator';
import { InvalidQueue } from '@/components/invalid-queue';
import { QueueStatusLabel } from '@/components/queue-status';
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
  const waiting = waitingEntries(snapshot.entries);
  const upcoming = waiting.slice(0, 3);
  return (
    <main id="main-content" className="display-page">
      <header className="display-top">
        <div className="display-identity">
          <strong className="queue-wordmark">NEXT</strong>
          <span aria-hidden="true" />
          <div>
            <p>Live service board</p>
            <h1>{snapshot.queue.name}</h1>
          </div>
        </div>
        <div className="display-statuses">
          <QueueStatusLabel status={snapshot.queue.status} />
          <ConnectionIndicator state={connection} />
        </div>
      </header>
      <div className="display-board">
        <section className="display-active" aria-labelledby="now-serving-label">
          <div className="display-ticket-stub" id="now-serving-label">
            Now serving <span aria-hidden="true">→</span>
          </div>
          <AnimatedQueueNumber
            className="display-active-number"
            number={active?.number}
            prefix={snapshot.queue.prefix}
          />
          <span
            className="display-ticket-cut display-ticket-cut-left"
            aria-hidden="true"
          />
          <span
            className="display-ticket-cut display-ticket-cut-right"
            aria-hidden="true"
          />
          <p className="sr-only" aria-live="polite">
            {active
              ? `Now serving ${active.numberLabel}`
              : 'No one is currently being served'}
          </p>
        </section>
        <aside className="display-rail" aria-label="Queue overview">
          <div>
            <strong>{waiting.length}</strong>
            <span>
              {waiting.length === 1 ? 'person waiting' : 'people waiting'}
            </span>
          </div>
          <div>
            <span className="motion-arrows" aria-hidden="true">
              ›››
            </span>
            <strong>
              {snapshot.queue.status === 'OPEN'
                ? 'Queue is moving'
                : snapshot.queue.status === 'PAUSED'
                  ? 'Queue is paused'
                  : 'Queue is closed'}
            </strong>
          </div>
        </aside>
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
        <section className="display-guidance">
          <span aria-hidden="true">i</span>
          <strong>Please approach when your number is called.</strong>
        </section>
      </div>
    </main>
  );
}
