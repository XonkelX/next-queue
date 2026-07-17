import { ConnectionIndicator } from './connection-indicator';

export function PrototypeHeader({
  eyebrow,
  title,
}: {
  eyebrow: string;
  title: string;
}) {
  return (
    <header className="prototype-header">
      <div>
        <p className="eyebrow">{eyebrow}</p>
        <h1>{title}</h1>
      </div>
      <ConnectionIndicator state="connected" />
    </header>
  );
}
