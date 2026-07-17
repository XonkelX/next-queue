import { SiteFooter } from '@/components/site-footer';
import { productConfig } from '@/config/product';

export default function AboutPage() {
  return (
    <>
      <main id="main-content" className="page-shell">
        <div className="about-intro">
          <p className="eyebrow">About the project</p>
          <h1>{productConfig.statement}</h1>
          <p className="lede">
            Next is a focused portfolio project exploring how thoughtful
            interface design can make a small, time-sensitive service system
            feel clear and humane.
          </p>
        </div>
        <div className="about-columns">
          <section className="about-block">
            <p className="eyebrow">Privacy</p>
            <h2>Less data is better.</h2>
            <p>
              Anonymous browser identities require no email, phone number,
              address, password, analytics, advertising, or profiling. A first
              name is optional, isolated from public queue state, and visible
              only to its owner and authorized staff.
            </p>
          </section>
          <section className="about-block">
            <p className="eyebrow">Technology</p>
            <h2>Built around one small domain.</h2>
            <p>
              Next.js, strict TypeScript, Supabase PostgreSQL, transactional RPC
              commands, Row Level Security, Realtime invalidation, Motion,
              Vitest, pgTAP, and Playwright form the engineering foundation.
            </p>
          </section>
          <section className="about-block">
            <p className="eyebrow">Accessibility</p>
            <h2>Clarity in every mode.</h2>
            <p>
              Semantic landmarks, visible focus, keyboard operation, high
              contrast, stable queue numerals, restrained live announcements,
              large touch targets, and reduced-motion alternatives are product
              requirements.
            </p>
          </section>
          <section className="about-block">
            <p className="eyebrow">Cost</p>
            <h2>Designed to remain $0.</h2>
            <p>
              The local stack uses Docker and the Supabase CLI. Hosted
              validation is limited to one Free project with no trial, payment
              method, paid add-on, analytics, or application deployment.
            </p>
          </section>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
