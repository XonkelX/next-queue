import {
  ArrowRight,
  Eye,
  Monitor,
  Radio,
  ShieldCheck,
  Smartphone,
  Users,
  Wifi,
} from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { demoRoutes } from '@/config/product';
import { CreateQueuePanel } from '@/features/queue/create-queue-panel';

export const dynamic = 'force-dynamic';

const demos = [
  {
    index: '01',
    title: 'Customer ticket',
    description: 'Join the seeded sample queue and see a personal ticket.',
    action: 'Open customer view',
    href: demoRoutes.customer,
    icon: Smartphone,
  },
  {
    index: '02',
    title: 'Staff board',
    description: 'Call, complete, pause, and reopen the seeded sample queue.',
    action: 'Open staff view',
    href: demoRoutes.staff,
    icon: Users,
  },
  {
    index: '03',
    title: 'Public display',
    description: 'View the seeded sample queue on the public service board.',
    action: 'Open display view',
    href: demoRoutes.display,
    icon: Monitor,
  },
];

export default function DemoPage() {
  return (
    <main id="main-content" className="page-shell demo-page">
      <div className="demo-intro">
        <p className="eyebrow">Live product demo</p>
        <h1>One queue. Three points of view.</h1>
        <p className="lede">
          Step into a working service flow as the customer, the team, or the
          room—or issue a private queue of your own.
        </p>
      </div>
      <CreateQueuePanel />
      <section className="demo-showcase" aria-labelledby="sample-queue-title">
        <div className="demo-showcase-media">
          <Image
            src="/images/lifestyle/staff-workflow.webp"
            alt="Staff member using the Next queue board while serving a customer"
            fill
            priority
            sizes="(max-width: 1100px) 100vw, 58vw"
          />
          <div className="demo-live-label">
            <Radio aria-hidden="true" size={18} />
            <span>
              <strong id="sample-queue-title">North Star Café</strong>
              Live sample queue
            </span>
          </div>
        </div>
        <div className="demo-grid" aria-label="Seeded sample queue views">
          {demos.map(
            ({ index, title, description, action, href, icon: Icon }) => (
              <Link className="demo-card" href={href} key={href}>
                <span className="demo-card-index" aria-hidden="true">
                  {index}
                </span>
                <span className="demo-card-icon">
                  <Icon aria-hidden="true" size={22} />
                </span>
                <div>
                  <h2>{title}</h2>
                  <p>{description}</p>
                </div>
                <span className="demo-card-action">
                  {action}
                  <ArrowRight aria-hidden="true" size={19} />
                </span>
              </Link>
            ),
          )}
        </div>
      </section>
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
