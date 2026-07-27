import type { ConnectionState } from '@/features/queue/types';

const labels: Record<ConnectionState, string> = {
  connecting: 'Connecting',
  connected: 'Connected',
  reconnecting: 'Reconnecting',
  offline: 'Offline',
  error: 'Connection issue',
};

export function ConnectionIndicator({
  state,
  announce = true,
}: {
  state: ConnectionState;
  announce?: boolean;
}) {
  return (
    <span
      className={`connection-state state-${state}`}
      {...(announce ? { role: 'status', 'aria-live': 'polite' } : {})}
    >
      <span className="status-dot" aria-hidden="true" />
      {labels[state]}
    </span>
  );
}
