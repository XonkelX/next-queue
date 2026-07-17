import type { ConnectionState } from '@/features/queue/types';

const labels: Record<ConnectionState, string> = {
  connecting: 'Connecting',
  connected: 'Connected',
  reconnecting: 'Reconnecting',
  offline: 'Offline',
  error: 'Connection issue',
};

export function ConnectionIndicator({ state }: { state: ConnectionState }) {
  return (
    <span
      className={`connection-state state-${state}`}
      role="status"
      aria-live="polite"
    >
      <span className="status-dot" aria-hidden="true" />
      {labels[state]}
    </span>
  );
}
