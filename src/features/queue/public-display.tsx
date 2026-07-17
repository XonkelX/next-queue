import { AnimatedQueueNumber } from '@/components/animated-queue-number';
import { ConnectionIndicator } from '@/components/connection-indicator';
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
  const upNext = waitingEntries(snapshot.entries).slice(0, 3);

  return (
    <main id="main-content" className="display-page">
      <header className="display-top">
        <div>
          <p className="eyebrow">Welcome</p>
          <h1>{snapshot.queue.name}</h1>
        </div>
        <ConnectionIndicator state="connected" />
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
              ? `Now serving ${formatQueueNumber(active.number, snapshot.queue.prefix)}`
              : 'No one is currently being served'}
          </p>
        </div>
      </section>
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
    </main>
  );
}
