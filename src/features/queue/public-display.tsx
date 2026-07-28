import { AnimatedQueueNumber } from '@/components/animated-queue-number';
import { ConnectionIndicator } from '@/components/connection-indicator';
import { QueueStatusLabel } from '@/components/queue-status';
import { formatQueueNumber } from './format';
import { createInitialQueueSnapshot } from './mock-data';
import { activeEntry, waitingEntries } from './transitions';
import type { QueueSnapshot } from './types';

export function PublicDisplay({
  initialSnapshot,
}: {
  initialSnapshot?: QueueSnapshot;
}) {
  const snapshot = initialSnapshot ?? createInitialQueueSnapshot();
  const active = activeEntry(snapshot.entries);
  const waiting = waitingEntries(snapshot.entries);
  const upNext = waiting.slice(0, 3);

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
          <ConnectionIndicator state="connected" />
        </div>
      </header>
      <div className="display-board">
        <section className="display-active" aria-labelledby="now-serving-label">
          <div className="display-ticket-stub" id="now-serving-label">
            <span>Now serving</span>
            <span aria-hidden="true">→</span>
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
              ? `Now serving ${formatQueueNumber(active.number, snapshot.queue.prefix)}`
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
            <strong>Queue is moving</strong>
          </div>
        </aside>
        <section className="display-up-next" aria-labelledby="up-next-title">
          <p className="quiet-label" id="up-next-title">
            Up next
          </p>
          <div className="next-numbers">
            {upNext.length ? (
              upNext.map((entry) => (
                <span className="queue-number" key={entry.id}>
                  {formatQueueNumber(entry.number, snapshot.queue.prefix)}
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
