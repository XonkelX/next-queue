# Next

> A calm, persistent real-time queue for small service teams.

Next uses a transactional Supabase PostgreSQL engine. Anonymous browser identities can create or join queues; a one-time queue capability grants staff membership; customer, staff, and public-display clients converge through filtered Realtime invalidations followed by authoritative revisioned snapshots.

The production application is live at [next-queue-omega.vercel.app](https://next-queue-omega.vercel.app). It runs on Vercel Hobby with one Supabase Free project in `us-east-1`; no paid service, trial, analytics, storage add-on, or custom domain is part of the deployment.

## Product surfaces

- `/demo` — create a persistent queue and receive its staff code once
- `/q/[slug]` — customer check-in, number, position, and service state
- `/q/[slug]/staff` — capability claim and authorized queue commands
- `/q/[slug]/display` — public-safe current and upcoming numbers
- `/` and `/about` — product and project context

## Identity and privacy

Supabase anonymous sign-in creates a unique user UUID without email, phone, password, social identity, address, or demographics. That user uses PostgreSQL's `authenticated` role; it is different from the public publishable key and the unauthenticated `anon` database role. The session is cookie-backed through `@supabase/ssr` and normally survives refreshes and same-profile tabs. Clearing site data, using another device, or signing out loses the anonymous identity.

Optional customer names live in `queue_entry_private`. Public Realtime tables and public snapshots contain number labels only. No tracking, analytics, advertising, or visitor profiling is installed.

## Local requirements

- Node.js 22
- npm
- Docker Desktop or another Docker-compatible runtime with at least 7 GB available

```bash
npm install
npm run db:start
npm run db:reset
```

Copy `.env.example` to `.env.local`, then use the local API URL and **publishable** key reported by the CLI. Do not place a secret/service-role key in the browser environment.

```bash
npm run dev
```

Open [http://localhost:3000/demo](http://localhost:3000/demo). Create a queue, save the one-time staff code privately, then open the customer, staff, and display routes in separate browser contexts. The deterministic `north-star-cafe` seed is public-state visual data only and intentionally has no recoverable staff code; automated tests create isolated queues and consume their one-time code.

The local stack is development-only, uses default local credentials, and must not be exposed to public traffic.

## Live demo

Open the [production demo](https://next-queue-omega.vercel.app/demo), create a queue, and save the staff code when it appears: the raw code is shown once and cannot be recovered. The creator is immediately authorized. To test synchronization, open the customer, staff, and display links in separate tabs or isolated browser profiles. A second staff profile must claim access with the code. Queue state persists remotely, while staff membership and customer ownership follow each profile's anonymous session.

Clearing site data, signing out, or changing browsers loses that anonymous identity. Losing both the creating staff session and the one-time code means staff access cannot be recovered through the product. Do not enter sensitive or regulated personal information; a display name is optional.

## Commands

```bash
npm run db:start
npm run db:stop
npm run db:status
npm run db:reset
npm run db:lint
npm run db:test
npm run db:types
npm run db:types:check
npm run test:integration
npm run test:realtime
npm run test:e2e
npm run test:production
npm run format
npm run format:check
npm run lint
npm run typecheck
npm run test
npm run build
npm audit
```

`npm run test:production` is a read-only smoke check against the public URL. Set `PRODUCTION_BASE_URL` to test another deployment. Queue-route coverage additionally accepts `PRODUCTION_QUEUE_SLUG` for a temporary synthetic queue; the suite never creates or mutates remote records.

`db:reset` drops only the local database, replays every migration, and reapplies safe seed data. `db:types` regenerates `src/lib/supabase/database.types.ts`; do not edit that file manually.

## Command and authorization model

Clients have no direct mutation grants. Explicit security-definer RPCs implement create, staff claim, join, call, complete, skip, pause, reopen, and close. Each validates `auth.uid()`, uses a fixed empty `search_path`, locks queue/entry rows, increments the queue revision once, records an idempotency receipt and append-only event, and returns a fresh snapshot. RLS separately limits table reads.

One partial unique index permits at most one `SERVING` entry per queue. `(queue_id, sequence)` and `(queue_id, number_label)` are unique, queue numbers are never reused, and position is calculated from ordered waiting rows.

## Realtime and reconnection

Only `queues` and display-safe `queue_entries` are in `supabase_realtime`. Each surface subscribes with a queue-ID filter. A change is an invalidation signal: related messages are debounced for 75 ms, a snapshot RPC is fetched, stale revisions are ignored, and the new authoritative state replaces local state. The client resynchronizes after subscription, browser online, channel recovery, and a meaningful visibility return. Healthy connections do not poll.

## Cost boundary

Production uses one Supabase Free project and one Vercel Hobby project only: no card, trial, compute upgrade, paid backup, PITR, log drain, paid analytics, paid storage, support plan, custom domain, or usage-based add-on. Free projects have finite database, bandwidth, build, function, and connection quotas and Supabase may pause an inactive project. No keep-alive is used to evade pausing. Re-check provider limits before relying on the service.

This portfolio deployment is provided as-is, without a commercial SLA. It has database-enforced authorization and basic access-attempt throttling, but not enterprise abuse protection, guaranteed recovery, or capacity for unbounded traffic.

## Production deployment

Vercel is connected to `XonkelX/next-queue`, uses `main` as the production branch, Node.js 22.x, and the standard Next.js build. Only these Production variables are configured:

```text
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
```

Deployments are produced by pushing reviewed commits to `main`; a manual equivalent is `npx vercel deploy --prod`. The browser uses only public Supabase configuration—never a service-role key or database password. See the [Story 3 production validation](docs/releases/story-3-production-validation.md) for the release evidence and remaining risks.

## Documentation

- [ADR 002](docs/architecture/adr-002-supabase-realtime.md)
- [Data model](docs/architecture/data-model.md)
- [Realtime protocol](docs/architecture/realtime-protocol.md)
- [Authorization and security](docs/security/authorization.md)
- [Motion system](docs/design/motion-system.md)
- [Product scope](docs/product/scope.md)
- [Story 3 production validation](docs/releases/story-3-production-validation.md)
