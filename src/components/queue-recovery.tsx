'use client';

export function QueueRecovery({
  error,
  retry,
}: {
  error: Error | undefined;
  retry: () => void;
}) {
  return (
    <section className="recovery-panel">
      <h1>{error ? 'We could not connect.' : 'Connecting to your queue…'}</h1>
      <p role="status">
        {error
          ? 'Check your connection and try again. Your saved queue and ticket will still be here.'
          : 'Getting the latest service information.'}
      </p>
      {error && (
        <button className="button button-accent" onClick={retry}>
          Try again
        </button>
      )}
    </section>
  );
}

export function QueueSyncNotice({
  connection,
  retry,
}: {
  connection: string;
  retry: () => void;
}) {
  if (connection === 'connected') return null;
  return (
    <div className="sync-notice" role="status">
      <span>
        {connection === 'offline'
          ? 'You are offline. Showing the last saved update.'
          : 'Reconnecting. These details may be out of date.'}
      </span>
      <button className="text-button" onClick={retry}>
        Retry connection
      </button>
    </div>
  );
}
