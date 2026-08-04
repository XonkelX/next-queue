import {
  ArrowRight,
  Eye,
  Info,
  Monitor,
  ShieldCheck,
  Store,
  UserRound,
  Users,
  Wifi,
} from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';
import { LandingQueuePreview } from '@/components/landing-queue-preview';
import { SiteFooter } from '@/components/site-footer';
import { demoRoutes } from '@/config/product';

const surfaces = [
  {
    title: 'Customer check-in',
    description:
      'Join in seconds, then see your number and position without creating an account.',
    href: demoRoutes.customer,
    icon: UserRound,
    image: '/images/lifestyle/wait-anywhere.webp',
    imageAlt:
      'A customer checking his place in line while waiting comfortably inside North Star Café.',
  },
  {
    title: 'Staff queue board',
    description:
      'One focused place to call, complete, skip, and pause the flow of service.',
    href: demoRoutes.staff,
    icon: Users,
    image: '/images/lifestyle/staff-workflow.webp',
    imageAlt:
      'A café worker managing the NEXT staff board as a customer approaches the counter.',
  },
  {
    title: 'Public display',
    description:
      'A distance-readable view that makes the active number unmistakable.',
    href: demoRoutes.display,
    icon: Monitor,
    image: '/images/lifestyle/public-display.webp',
    imageAlt:
      'The NEXT public queue display mounted above the service counter at North Star Café.',
  },
];

export default function Home() {
  return (
    <>
      <main id="main-content" className="page-shell home-page">
        <section className="hero home-hero" aria-labelledby="home-title">
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
          <div className="home-product-preview">
            <LandingQueuePreview />
            <ol className="surface-list home-surface-list">
              {surfaces.map(({ icon: Icon, ...surface }, index) => (
                <li key={surface.href}>
                  <Link className="surface-row" href={surface.href}>
                    <span className="surface-index">{index + 1}</span>
                    <Icon aria-hidden="true" />
                    <h3>{surface.title.replace(' check-in', '')}</h3>
                    <ArrowRight aria-hidden="true" size={20} />
                  </Link>
                </li>
              ))}
            </ol>
          </div>
        </section>

        <section className="home-signal-band" aria-label="Product summary">
          <Info aria-hidden="true" />
          <div>
            <h2>One queue. Everywhere.</h2>
            <p>
              Customer, staff, and display update from the same live queue
              state.
            </p>
          </div>
          <Store aria-hidden="true" className="home-store-icon" />
        </section>

        <section
          className="section home-detail-section"
          id="how-it-works"
          aria-labelledby="surfaces-title"
        >
          <div className="section-heading">
            <p className="eyebrow">One queue · Three views</p>
            <h2 id="surfaces-title">Everyone sees what matters now.</h2>
          </div>
          <div className="surface-detail-grid">
            {surfaces.map(({ icon: Icon, ...surface }, index) => (
              <article key={surface.href}>
                <div className="surface-detail-media">
                  <Image
                    src={surface.image}
                    alt={surface.imageAlt}
                    fill
                    sizes="(max-width: 820px) 100vw, 33vw"
                  />
                </div>
                <div className="surface-detail-copy">
                  <div className="surface-detail-heading">
                    <span className="surface-index">0{index + 1}</span>
                    <Icon aria-hidden="true" />
                  </div>
                  <h3>{surface.title}</h3>
                  <p>{surface.description}</p>
                  <Link className="surface-detail-link" href={surface.href}>
                    Explore this view
                    <ArrowRight aria-hidden="true" size={18} />
                  </Link>
                </div>
              </article>
            ))}
          </div>
        </section>

        <section className="home-outcome-story" aria-labelledby="outcome-title">
          <div className="home-outcome-media">
            <Image
              src="/images/lifestyle/service-handoff.webp"
              alt="A North Star Café worker handing a drink to a customer beneath the NEXT public display."
              fill
              sizes="(max-width: 820px) 100vw, 68vw"
            />
          </div>
          <div className="home-outcome-copy">
            <p className="eyebrow">From waiting to welcomed</p>
            <h2 id="outcome-title">
              A better handoff, not just a shorter line.
            </h2>
            <p>
              Customers keep their time. Staff keep the room moving. The moment
              of service stays human.
            </p>
            <Link className="button button-accent" href="/demo">
              Experience the queue
              <ArrowRight aria-hidden="true" size={18} />
            </Link>
          </div>
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
