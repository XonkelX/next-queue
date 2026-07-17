# Next

> A calm, real-time queue for small service teams.

Next is a minimalist queue-management product concept for cafés, barbershops, repair desks, clinics, campus offices, and small service counters. It gives customers, staff, and a public display a clear view of one small ordered queue.

## Story 1 status

This repository currently contains a polished **visual prototype** with deterministic local state. It demonstrates the intended product, interaction, accessibility, responsive layout, and motion language. It does **not** synchronize separate browser clients yet. Persistent production real-time synchronization is scheduled for the next engineering story.

## Product surfaces

- `/q/north-star-cafe` — customer check-in and personal queue position
- `/q/north-star-cafe/staff` — focused staff queue controls
- `/q/north-star-cafe/display` — distance-readable public display
- `/demo` — guided entry to all three prototypes
- `/` — concise product landing page
- `/about` — privacy, accessibility, technology, and cost principles

## Local development

Requires Node.js 22 and npm.

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Commands

```bash
npm run format
npm run format:check
npm run lint
npm run typecheck
npm run test
npm run test:e2e
npm run build
```

## Architecture direction

Queue rules live independently from React in `src/features/queue`. A deliberately small adapter contract in `src/lib/realtime` separates the UI from the future persistent provider. The current recommendation is Supabase Postgres with transactional commands and Realtime subscriptions, subject to a focused Story 2 spike and a fresh free-tier review before provisioning anything.

See [the real-time evaluation](docs/architecture/realtime-evaluation.md) for requirements, current official quotas, alternatives, risks, and the next implementation step.

## Design and motion

The interface uses a warm neutral foundation, one vermilion accent, large editorial typography, tabular monospace queue numbers, generous whitespace, and borders instead of dashboard-card chrome. Motion communicates number changes, list insertion, completion, and connectivity. Every meaningful animation has a reduced-motion alternative.

See [the motion system](docs/design/motion-system.md).

## Accessibility

The foundation includes semantic landmarks, one clear page heading per route, keyboard-operable controls, visible focus, 44px minimum icon targets, status text beyond color, restrained `aria-live` regions, stable-width queue numbers, high-contrast display treatment, and `prefers-reduced-motion` support. Browser tests reject serious or critical automated axe violations; automated checks complement manual keyboard, zoom, contrast, and screen-reader review.

## Privacy

No account, email, phone number, address, tracking, analytics, advertising, or third-party profiling is used. Customer first name is optional. Public surfaces prioritize queue numbers and never expose internal IDs.

## Cost constraint

Story 1 runs locally with no database or external service. No paid plan, trial, payment information, production credential, hosted analytics, or deployment is configured. The architecture recommendation is explicitly bounded by current free quotas and must fail closed rather than create charges.

## Testing

Vitest covers queue formatting, ordering, allowed and rejected transitions, empty states, joining, staff controls, connection states, public-display content, and reduced-motion helpers. Playwright covers primary routes, customer/staff flows, public display, mobile navigation, theme switching, reduced motion, accessibility, headings, and narrow viewport overflow.

GitHub Actions runs formatting, linting, type checking, unit/component tests, production build, and the Chromium browser suite using only standard GitHub-hosted workflow features.

## Roadmap

1. **Story 1 — Foundation and visual prototype:** current.
2. **Story 2 — Persistent real-time queue:** transactional command endpoint, database policies, subscriptions, reconnect/resync, conflict tests, and quota-safe deployment decision.
3. **Version 1 polish:** production QA and deployment only after Story 2 is validated.

The Version 1 boundary is documented in [product scope](docs/product/scope.md).
