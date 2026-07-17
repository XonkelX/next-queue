import Link from 'next/link';

export function InvalidQueue() {
  return (
    <main id="main-content" className="prototype-shell">
      <div className="demo-intro">
        <p className="eyebrow">Queue unavailable</p>
        <h1>This queue could not be found.</h1>
        <p className="lede">
          Check the address, or return to the guided prototype.
        </p>
        <Link className="button button-accent" href="/demo">
          Open the demo
        </Link>
      </div>
    </main>
  );
}
