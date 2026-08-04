import Link from 'next/link';
import type { ConnectionState, QueueStatus } from '@/features/queue/types';
import { ConnectionIndicator } from './connection-indicator';
import { QueueStatusLabel } from './queue-status';
import { ThemeToggle } from './theme-toggle';

export function QueueSurfaceHeader({
  queueName,
  surface,
  status,
  connection,
  announceConnection = true,
}: {
  queueName: string;
  surface: string;
  status: QueueStatus;
  connection: ConnectionState;
  announceConnection?: boolean;
}) {
  return (
    <header className="queue-surface-header">
      <div className="queue-surface-identity">
        <Link className="queue-wordmark" href="/" aria-label="Next home">
          NEXT
        </Link>
        <span className="queue-identity-rule" aria-hidden="true" />
        <div>
          <span className="queue-surface-kicker">{surface}</span>
          <h1 className="queue-venue-name">{queueName}</h1>
        </div>
      </div>
      <div className="queue-surface-actions">
        <QueueStatusLabel status={status} />
        <ConnectionIndicator state={connection} announce={announceConnection} />
        <ThemeToggle />
      </div>
    </header>
  );
}
