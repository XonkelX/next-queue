import { ArrowRight, Monitor, Smartphone, Users } from 'lucide-react';
import Link from 'next/link';
import { demoRoutes } from '@/config/product';

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
      'Call, complete, skip, and pause with deterministic local state.',
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
        <p className="eyebrow">Story 1 visual prototype</p>
        <h1>See the queue from every side.</h1>
        <p className="lede">
          Open each surface to explore the intended flow, motion, and responsive
          behavior.
        </p>
      </div>
      <aside className="demo-note">
        <span aria-hidden="true">↗</span>
        <span>
          Try opening all three views in separate tabs. This foundation uses
          deterministic local state, so tabs are not synchronized yet.
          Persistent multi-client real-time behavior is the next engineering
          story.
        </span>
      </aside>
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
