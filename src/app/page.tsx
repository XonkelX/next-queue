import { ArrowRight, Eye, ShieldCheck, Wifi } from 'lucide-react';
import Link from 'next/link';
import { LandingQueuePreview } from '@/components/landing-queue-preview';
import { SiteFooter } from '@/components/site-footer';
import { demoRoutes } from '@/config/product';

const surfaces = [
  {
    title: 'Customer check-in',
    description:
      'Join in seconds, then see your number and position without creating an account.',
    href: demoRoutes.customer,
  },
  {
    title: 'Staff queue board',
    description:
      'One focused place to call, complete, skip, and pause the flow of service.',
    href: demoRoutes.staff,
  },
  {
    title: 'Public display',
    description:
      'A distance-readable view that makes the active number unmistakable.',
    href: demoRoutes.display,
  },
];

export default function Home() {
  return (
    <>
      <main id="main-content" className="page-shell">
        <section className="hero" aria-labelledby="home-title">
          <div className="hero-copy">
            <p className="eyebrow">Real-time queue management</p>
            <h1 id="home-title" className="display-type">
              A calmer way to wait.
            </h1>
            <p className="lede">
              Next gives customers, staff, and public displays one synchronized
              view of the queue.
            </p>
            <div className="hero-actions">
              <Link className="button button-accent" href="/demo">
                Open the demo <ArrowRight aria-hidden="true" size={18} />
              </Link>
              <Link className="button button-secondary" href="#how-it-works">
                See how it works
              </Link>
            </div>
          </div>
          <LandingQueuePreview />
        </section>

        <section
          className="section"
          id="how-it-works"
          aria-labelledby="surfaces-title"
        >
          <div className="section-heading">
            <p className="eyebrow">One queue · Three views</p>
            <h2 id="surfaces-title">Everyone sees what matters now.</h2>
          </div>
          <ol className="surface-list">
            {surfaces.map((surface, index) => (
              <li key={surface.href}>
                <Link className="surface-row" href={surface.href}>
                  <span className="surface-index">0{index + 1}</span>
                  <h3>{surface.title}</h3>
                  <p>{surface.description}</p>
                  <ArrowRight aria-hidden="true" size={20} />
                </Link>
              </li>
            ))}
          </ol>
        </section>

        <section className="section" aria-labelledby="principles-title">
          <div className="section-heading">
            <p className="eyebrow">Designed for service</p>
            <h2 id="principles-title">Quiet technology. Clear progress.</h2>
          </div>
          <div className="principles-grid">
            <article className="principle">
              <Wifi aria-hidden="true" size={24} />
              <h3>Immediate</h3>
              <p>Every view is designed around the same ordered queue state.</p>
            </article>
            <article className="principle">
              <Eye aria-hidden="true" size={24} />
              <h3>Understandable</h3>
              <p>Large type and plain language make the next action obvious.</p>
            </article>
            <article className="principle">
              <ShieldCheck aria-hidden="true" size={24} />
              <h3>Private by default</h3>
              <p>No accounts, contact details, tracking, or advertising.</p>
            </article>
          </div>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
