# Real-time architecture evaluation

**Decision status:** proposed for Story 2

**Last verified against official documentation:** 2026-07-17

**Story 1 implementation:** local deterministic state only; no provider provisioned

## Requirements

Next needs low-latency updates across customer, staff, and display clients; one ordered queue; atomic prevention of multiple active customers; durable state; reconnect and full-state resync; a clear connection state; local development; automated tests; Vercel-compatible frontend hosting; and a production path that remains at $0 without a card, trial, or surprise overage.

Commands must be authoritative. A client may optimistically acknowledge a staff action, but the server-side transaction decides the resulting queue state. Events are a notification mechanism, not the source of truth; reconnecting clients fetch a fresh snapshot.

## Options considered

| Option                                        | Free-tier evidence                                                                                                                                                                                        | Fit and constraints                                                                                                                                                                                                                                                                                                                           | Decision                                                                                                                            |
| --------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| Supabase Postgres + Realtime                  | Free Realtime includes 2 million messages and 200 peak connections; the Free plan limit is 100 messages/second.                                                                                           | Postgres transactions can serialize `call next`, enforce one `SERVING` row, keep monotonic numbers, and persist history. Realtime supplies browser WebSocket subscriptions and reconnect behavior. Client/server SDKs are straightforward with Next.js and Vercel. Hosted-project inactivity and quota behavior must be tested before launch. | **Recommend a Story 2 spike.** Best balance of correctness, operational clarity, portfolio value, and replaceable adapter boundary. |
| Firebase Realtime Database (Spark)            | Spark requires no payment information. Realtime Database includes 1 GB storage, 10 GB/month downloads, and 100 simultaneous connections; exceeding Spark quota shuts the product off rather than billing. | Mature client reconnect and local emulator. Atomic transactions are possible, but enforcing relational queue invariants and auditable ordered transitions in a JSON tree is less clear than Postgres. Spark cannot use Cloud Functions, which complicates trusted commands without upgrading to billing.                                      | Reject for this scope. Excellent client sync, weaker no-card authoritative-command story.                                           |
| Cloudflare Workers + Durable Objects (SQLite) | Durable Objects are available on Workers Free: 100,000 requests/day, 13,000 GB-s/day, 5 million rows read/day, 100,000 rows written/day, and 5 GB stored. Limits fail when exceeded.                      | A Durable Object per queue naturally serializes commands and can host hibernatable WebSockets with SQLite persistence. Strong correctness and engineering signal, but it adds a second deployment platform and more protocol/operations code than this small product needs.                                                                   | Keep as the strongest fallback if the Supabase spike exposes unacceptable sleep or policy behavior.                                 |
| Vercel Functions WebSockets + shared store    | Vercel announced WebSocket support in Public Beta on 2026-06-22. Connections use Fluid compute; cross-instance clients still require shared durable state/pub-sub.                                        | Direct hosting alignment, but the feature and upgrade API are explicitly beta/experimental. A connection is pinned to one function instance, so a separate shared store is needed for cross-instance delivery and persistence. This increases moving parts and risks violating the simple $0 constraint.                                      | Reject for Version 1; reassess after general availability.                                                                          |
| Server-Sent Events or long polling            | No provider is inherently required.                                                                                                                                                                       | SSE is one-way and Vercel functions have finite execution; a separate durable broker remains necessary. Long polling is a viable degraded fallback but adds latency and request churn. Neither solves ordering or persistence.                                                                                                                | Use polling only as a future fallback/resync path, not the primary transport.                                                       |

## Recommendation

Spike **Supabase Postgres + Realtime** behind `QueueRealtimeAdapter` in Story 2.

1. Store the minimal `queues` and `queue_entries` tables in Postgres.
2. Put `join`, `call_next`, `complete`, `skip`, and queue-status changes behind transactional database functions or a thin trusted command endpoint.
3. Enforce one active entry with a partial unique index and enforce unique `(queue_id, number)`.
4. Subscribe clients to queue-scoped changes. After connect or reconnect, fetch an authoritative ordered snapshot before applying later events.
5. Track a monotonic queue revision or `updated_at` plus stable event ordering so stale updates are discarded.
6. Exercise concurrent `call next`, network interruption, background-tab reconnect, free-project wake behavior, and quota exhaustion before any deployment decision.

Supabase is not installed and the adapter is not implemented in Story 1. This document is a recommendation, not a claim of production synchronization.

## Cost controls

- Create only a Free project and never add payment information or a paid add-on.
- Verify the dashboard still provides hard free-plan limits immediately before provisioning.
- Treat quota errors as an offline/recovery state and never silently upgrade.
- Keep payloads queue-scoped and small; unsubscribe when a surface unmounts.
- Do not add analytics, log drains, backups, or marketplace integrations that introduce billing.
- Retain the provider-independent adapter and domain tests so Firebase or Durable Objects remains a feasible migration.

## Rejected assumptions and unresolved risks

- Free tiers and beta capabilities change; the figures above are dated evidence, not a permanent guarantee.
- Supabase hosted Free projects may have wake/suspension behavior that harms an always-ready service counter. Current behavior must be measured in the Story 2 spike.
- Anonymous Version 1 staff control needs a safe capability model. With no authentication, a high-entropy staff capability or another narrow authorization scheme must prevent public clients from issuing staff commands without collecting personal data.
- Postgres-change delivery is not itself a durable client event log. Reconnect must always resync a snapshot, and commands need idempotency keys.
- The 200-connection free quota is sufficient for a portfolio demonstration and very small deployments, not broad production scale.
- Vercel WebSocket support is new public beta. The architecture should not depend on it until its stability, Hobby quotas, and cross-instance persistence story are explicit.

## Next implementation story

Create an isolated provider spike with local Supabase tooling, migrations, constraints, transactional command tests, an adapter implementation, reconnect/resync tests, and a two-browser Playwright scenario. Do not deploy or provision production credentials until the free tier and no-card requirement are rechecked on that day.

## Official sources

- [Supabase Realtime pricing](https://supabase.com/docs/guides/realtime/pricing)
- [Supabase Realtime limits](https://supabase.com/docs/guides/realtime/limits)
- [Supabase Realtime concepts](https://supabase.com/docs/guides/realtime/concepts)
- [Firebase pricing plans](https://firebase.google.com/docs/projects/billing/firebase-pricing-plans)
- [Firebase Realtime Database billing](https://firebase.google.com/docs/database/usage/billing)
- [Firebase Realtime Database limits](https://firebase.google.com/docs/database/usage/limits)
- [Cloudflare Durable Objects pricing](https://developers.cloudflare.com/durable-objects/platform/pricing/)
- [Cloudflare Durable Objects overview](https://developers.cloudflare.com/durable-objects/)
- [Vercel WebSocket public beta announcement](https://vercel.com/changelog/websocket-support-is-now-in-public-beta)
- [Vercel real-time WebSocket architecture guide](https://vercel.com/kb/guide/real-time-chat-websockets)
- [Vercel Functions lifecycle](https://vercel.com/docs/functions)
