import type { Metadata } from 'next';
import { Accessibility, KeyRound, Network, ShieldCheck } from 'lucide-react';
import Image from 'next/image';
import { SiteFooter } from '@/components/site-footer';
import { productConfig } from '@/config/product';

export const metadata: Metadata = {
  title: 'About',
  alternates: { canonical: '/about' },
};

const principles = [
  {
    eyebrow: 'Privacy',
    title: 'Less data is better.',
    icon: ShieldCheck,
    description:
      'No email, phone number, password, analytics, advertising, or profiling. Optional first names stay private.',
  },
  {
    eyebrow: 'Coordination',
    title: 'One synchronized system.',
    icon: Network,
    description:
      'Customers see their place, staff manage service, and the public screen shows the current number.',
  },
  {
    eyebrow: 'Accessibility',
    title: 'Clarity in every mode.',
    icon: Accessibility,
    description:
      'Keyboard operation, high contrast, large targets, calm announcements, and reduced-motion alternatives.',
  },
  {
    eyebrow: 'Access',
    title: 'Your team stays in control.',
    icon: KeyRound,
    description:
      'A private staff code controls access to your queue. Save it together with your staff-board link.',
  },
];

export default function AboutPage() {
  return (
    <>
      <main id="main-content" className="page-shell about-page">
        <div className="about-intro">
          <p className="eyebrow">About Next</p>
          <h1>Clear queues. Less friction.</h1>
          <p className="lede">
            {productConfig.statement} Next helps teams organize arrivals, call
            the next customer, and keep everyone informed during service.
          </p>
        </div>
        <section className="about-human-story" aria-labelledby="people-title">
          <div className="about-human-media">
            <Image
              src="/images/lifestyle/cafe-owner.webp"
              alt="A North Star Café team member beside the NEXT staff board while service continues behind her."
              fill
              sizes="(max-width: 820px) 100vw, 64vw"
            />
          </div>
          <div className="about-human-copy">
            <p className="eyebrow">Made for real service</p>
            <h2 id="people-title">Technology should support the room.</h2>
            <p>
              NEXT keeps the operational work visible and the interface quiet,
              so small teams can focus on the person in front of them.
            </p>
          </div>
        </section>
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
        <section className="about-manifesto" aria-label="Product principle">
          Quiet technology. Clear progress.
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
