import {
  Bell,
  Check,
  Clock3,
  Info,
  Megaphone,
  Radio,
  Users,
} from 'lucide-react';
import type { ReactNode } from 'react';
import { AnimatedQueueNumber } from '@/components/animated-queue-number';
import { QueueSurfaceHeader } from '@/components/queue-surface-header';
import type { ConnectionState, QueueEntry, QueueStatus } from './types';

export function CustomerTicket({
  queueName,
  queueStatus,
  prefix,
  ownEntry,
  activeLabel,
  position,
  waitingCount,
  connection,
  announceConnection = true,
  joinContent,
}: {
  queueName: string;
  queueStatus: QueueStatus;
  prefix: string;
  ownEntry: QueueEntry | undefined;
  activeLabel: string;
  position: number;
  waitingCount: number;
  connection: ConnectionState;
  announceConnection?: boolean;
  joinContent: ReactNode;
}) {
  const peopleAhead = ownEntry
    ? ownEntry.status === 'SERVING'
      ? 0
      : Math.max(position - 1, 0)
    : undefined;
  const called =
    ownEntry?.status === 'SERVING' || ownEntry?.status === 'COMPLETED';
  const queueMotion =
    queueStatus === 'OPEN'
      ? 'Queue is moving'
      : queueStatus === 'PAUSED'
        ? 'Queue is paused'
        : 'Queue is closed';
  const liveUpdateLabel: Record<ConnectionState, string> = {
    connected: 'Live updates connected',
    connecting: 'Live updates starting',
    reconnecting: 'Live updates resuming',
    offline: 'Live updates interrupted',
    error: 'Live updates unavailable',
  };
  const guidance = called
    ? 'It’s your turn.'
    : ownEntry
      ? 'Stay nearby — this page updates automatically.'
      : 'Your name is optional and never shown to other guests.';

  return (
    <div
      className={`ticket-experience ${ownEntry ? 'ticket-issued' : 'ticket-unissued'}`}
      role="region"
      aria-label="Keep your place. Keep your day."
    >
      <QueueSurfaceHeader
        queueName={queueName}
        surface="Customer ticket"
        status={queueStatus}
        connection={connection}
        announceConnection={announceConnection}
      />

      <div className="ticket-board">
        <section className="ticket-hero" aria-labelledby="your-place-title">
          <div className="ticket-stub">
            <span id="your-place-title">
              {ownEntry ? "You're in line" : 'Your ticket'}
            </span>
            <span aria-hidden="true">↓</span>
          </div>
          <div className="ticket-number-field">
            <AnimatedQueueNumber
              className="ticket-number"
              number={ownEntry?.number}
              prefix={prefix}
            />
            <span className="ticket-cut ticket-cut-left" aria-hidden="true" />
            <span className="ticket-cut ticket-cut-right" aria-hidden="true" />
          </div>
        </section>

        <aside className="ticket-stats" aria-label="Live queue details">
          <div className="ticket-stat ticket-stat-position">
            <Users aria-hidden="true" />
            <strong>{peopleAhead ?? '—'}</strong>
            <span>
              {peopleAhead === 1 ? 'person' : 'people'}
              <br />
              ahead
            </span>
            <small>
              {ownEntry && position
                ? `Your position: ${position} of ${waitingCount}`
                : 'Your position'}
            </small>
          </div>
          <div className="ticket-stat ticket-stat-serving">
            <Megaphone aria-hidden="true" />
            <span>Now serving</span>
            <strong className="queue-number">{activeLabel}</strong>
          </div>
          <div className="ticket-stat ticket-stat-motion">
            <span className="motion-arrows" aria-hidden="true">
              ›››
            </span>
            <strong>{queueMotion}</strong>
          </div>
          <div className="ticket-stat ticket-stat-live">
            <Radio aria-hidden="true" />
            <span>{liveUpdateLabel[connection]}</span>
          </div>
        </aside>

        <section className="ticket-progress" aria-label="Queue progress">
          <div className={`ticket-step ${ownEntry ? 'is-complete' : ''}`}>
            <span className="ticket-step-marker">
              <Check aria-hidden="true" />
            </span>
            <strong>Joined</strong>
            <small>{ownEntry ? 'Place saved' : 'Not yet'}</small>
          </div>
          <div
            className={`ticket-step ${ownEntry && !called ? 'is-active' : ''}`}
          >
            <span className="ticket-step-marker">
              <Clock3 aria-hidden="true" />
            </span>
            <strong>Waiting</strong>
            <small>
              {ownEntry && !called ? 'You’re in line' : 'Next step'}
            </small>
          </div>
          <div className={`ticket-step ${called ? 'is-active' : ''}`}>
            <span className="ticket-step-marker">
              <Bell aria-hidden="true" />
            </span>
            <strong>Called</strong>
            <small>{called ? 'It’s your turn' : 'We’ll show it here'}</small>
          </div>
        </section>

        <section className="ticket-guidance" aria-label="What to do next">
          <Info aria-hidden="true" />
          <p>{guidance}</p>
        </section>

        <section className="ticket-join-area" aria-label="Queue check-in">
          {joinContent}
        </section>
      </div>
      <p className="sr-only" aria-live="polite">
        {waitingCount} customers are currently waiting.
      </p>
    </div>
  );
}
