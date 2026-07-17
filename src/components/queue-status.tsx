import type { QueueStatus } from '@/features/queue/types';

export function QueueStatusLabel({ status }: { status: QueueStatus }) {
  return (
    <span className={`status-chip state-${status.toLowerCase()}`}>
      <span className="status-dot" aria-hidden="true" />
      Queue {status.toLowerCase()}
    </span>
  );
}
