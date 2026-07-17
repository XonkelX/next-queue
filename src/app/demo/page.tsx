import { ArrowRight, Monitor, Smartphone, Users } from 'lucide-react';
import Link from 'next/link';
import { demoRoutes } from '@/config/product';
import { CreateQueuePanel } from '@/features/queue/create-queue-panel';

export const dynamic = 'force-dynamic';

const demos = [
  {
    title: 'Customer',
    description: 'Join the queue and see a personal ticket and position.',
    href: demoRoutes.customer,
    icon: Smartphone,
  },
  {
    title: 'Staff',
    description:
      'Claim access, then call, complete, skip, pause, reopen, or close.',
    href: demoRoutes.staff,
    icon: Users,
  },
  {
    title: 'Display',
    description: 'View the distance-readable public service board.',
    href: demoRoutes.display,
    icon: Monitor,
  },
];

export default function DemoPage() {
  return (
    <main id="main-content" className="page-shell">
      <div className="demo-intro">
        <p className="eyebrow">Story 2 persistent prototype</p>
        <h1>See the queue from every side.</h1>
        <p className="lede">
          Create a persistent queue, then open each synchronized surface in a
          separate browser context.
        </p>
      </div>
      <aside className="demo-note">
        <span aria-hidden="true">↗</span>
        <span>
          Open staff, customer, and display views separately. PostgreSQL is
          authoritative; Realtime invalidates each client and a fresh revisioned
          snapshot converges the interface.
        </span>
      </aside>
      <CreateQueuePanel />
      <div className="demo-grid">
        {demos.map(({ title, description, href, icon: Icon }) => (
          <Link className="demo-card" href={href} key={href}>
            <span className="demo-card-icon">
              <Icon aria-hidden="true" size={22} />
            </span>
            <h2>{title}</h2>
            <p>{description}</p>
            <span>
              Open view{' '}
              <ArrowRight
                aria-hidden="true"
                size={17}
                style={{ verticalAlign: 'middle', marginLeft: 6 }}
              />
            </span>
          </Link>
        ))}
      </div>
    </main>
  );
}
