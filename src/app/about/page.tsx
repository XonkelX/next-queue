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
              The Version 1 product needs no account, email, phone number,
              address, analytics, advertising, or third-party profiling. A first
              name is optional, and public displays prioritize queue numbers.
            </p>
          </section>
          <section className="about-block">
            <p className="eyebrow">Technology</p>
            <h2>Built around one small domain.</h2>
            <p>
              Next.js, strict TypeScript, Motion, schema-ready domain
              boundaries, Vitest, Testing Library, and Playwright form the
              foundation. Story 1 deliberately uses local deterministic state;
              production synchronization comes next.
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
              No paid service, trial, database, production credential,
              analytics, or deployment is enabled in this foundation story.
              Infrastructure will only be provisioned after its free-tier
              constraints are verified.
            </p>
          </section>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
