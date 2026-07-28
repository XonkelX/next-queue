import {
  ArrowRight,
  Eye,
  Monitor,
  ShieldCheck,
  Smartphone,
  Users,
  Wifi,
} from 'lucide-react';
import Link from 'next/link';
import { demoRoutes } from '@/config/product';
import { CreateQueuePanel } from '@/features/queue/create-queue-panel';

export const dynamic = 'force-dynamic';

const demos = [
  {
    title: 'Sample customer',
    description: 'Join the seeded sample queue and see a personal ticket.',
    href: demoRoutes.customer,
    icon: Smartphone,
  },
  {
    title: 'Sample staff',
    description:
      'Open the seeded sample staff board. Custom queue codes do not work here.',
    href: demoRoutes.staff,
    icon: Users,
  },
  {
    title: 'Sample display',
    description: 'View the seeded sample queue on the public service board.',
    href: demoRoutes.display,
    icon: Monitor,
  },
];

export default function DemoPage() {
  return (
    <main id="main-content" className="page-shell demo-page">
      <div className="demo-intro">
        <p className="eyebrow">Live product demo</p>
        <h1>See the queue from every side.</h1>
        <p className="lede">
          Explore the seeded sample below, or create your own queue and use the
          links shown with its private staff code.
        </p>
      </div>
      <CreateQueuePanel />
      <div className="demo-grid" aria-label="Seeded sample queue views">
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
      <aside className="demo-note" aria-label="Demo principles">
        <div className="demo-proof">
          <Wifi aria-hidden="true" />
          <span>
            <strong>See it in real time</strong>
            Customer, staff, and display stay synchronized.
          </span>
        </div>
        <div className="demo-proof">
          <ShieldCheck aria-hidden="true" />
          <span>
            <strong>Private by design</strong>
            No account, phone number, tracking, or advertising.
          </span>
        </div>
        <div className="demo-proof">
          <Eye aria-hidden="true" />
          <span>
            <strong>Use the right queue</strong>
            Custom queue buttons appear beside its one-time code.
          </span>
        </div>
      </aside>
    </main>
  );
}
