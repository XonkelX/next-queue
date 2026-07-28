import {
  Accessibility,
  BadgeDollarSign,
  Network,
  ShieldCheck,
} from 'lucide-react';
import { SiteFooter } from '@/components/site-footer';
import { productConfig } from '@/config/product';

const principles = [
  {
    eyebrow: 'Privacy',
    title: 'Less data is better.',
    icon: ShieldCheck,
    description:
      'No email, phone number, password, analytics, advertising, or profiling. Optional first names stay private.',
  },
  {
    eyebrow: 'Technology',
    title: 'One synchronized system.',
    icon: Network,
    description:
      'Next.js, PostgreSQL transactions, Row Level Security, and Realtime keep every view aligned.',
  },
  {
    eyebrow: 'Accessibility',
    title: 'Clarity in every mode.',
    icon: Accessibility,
    description:
      'Keyboard operation, high contrast, large targets, calm announcements, and reduced-motion alternatives.',
  },
  {
    eyebrow: 'Cost',
    title: 'Designed to remain $0.',
    icon: BadgeDollarSign,
    description:
      'Built and validated within practical free-tier limits, without paid add-ons or usage-based billing.',
  },
];

export default function AboutPage() {
  return (
    <>
      <main id="main-content" className="page-shell about-page">
        <div className="about-intro">
          <p className="eyebrow">About the project</p>
          <h1>Clear queues. Less friction.</h1>
          <p className="lede">
            {productConfig.statement} Next explores how thoughtful interface
            design can make a small, time-sensitive service system feel clear
            and humane.
          </p>
        </div>
        <div className="about-columns">
          {principles.map(
            ({ eyebrow, title, icon: Icon, description }, index) => (
              <section className="about-block" key={eyebrow}>
                <span className="about-index" aria-hidden="true">
                  {String(index + 1).padStart(2, '0')}
                </span>
                <Icon className="about-icon" aria-hidden="true" />
                <div>
                  <p className="eyebrow">{eyebrow}</p>
                  <h2>{title}</h2>
                  <p>{description}</p>
                </div>
              </section>
            ),
          )}
        </div>
        <section className="about-manifesto" aria-label="Project principle">
          Quiet technology. Clear progress.
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
