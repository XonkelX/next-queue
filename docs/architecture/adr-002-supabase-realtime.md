# ADR 002: Supabase PostgreSQL and Realtime

**Status:** implemented locally; remote Free validation recorded in the pull request and final Story 2 report

## Context and requirements

Next needs durable ordered queue state, anonymous privacy-preserving identity, database-enforced staff authorization, atomic concurrent commands, live multi-client updates, complete reconnect recovery, reproducible local development, and a hard $0 boundary.

## Decision

Use Supabase anonymous Auth, PostgreSQL, explicit transactional RPCs, RLS, and filtered Realtime Postgres Changes behind the provider-independent queue adapter.

Anonymous Auth supplies a stable browser-scoped UUID without contact information. Anonymous users use the `authenticated` PostgreSQL role and carry an `is_anonymous` JWT claim; the publishable key only identifies the public application and does not create a user. Identity-bearing routes are dynamically rendered, browser/server clients use `@supabase/ssr` cookies, and the Next.js proxy validates/refreshes claims. See the [official anonymous Auth guidance](https://supabase.com/docs/guides/auth/auth-anonymous) and [SSR client guidance](https://supabase.com/docs/guides/auth/server-side/creating-a-client).

RPC commands are used because queue transitions span multiple rows and require locks, authorization, revision increments, idempotency receipts, and audit events in one transaction. Direct client writes are revoked. Security-definer functions derive the actor from `auth.uid()`, never accept an actor UUID or staff Boolean, and use an explicit empty `search_path`.

Public queue state and private ownership/names are separate tables. This matters because RLS is row-oriented and Realtime payloads must never contain private customer fields.

## Realtime protocol

Story 2 uses Postgres Changes because it is simple and proportional for a small portfolio queue. Only `queues` and `queue_entries` are published, and subscriptions filter by queue UUID. Supabase now recommends database-triggered Broadcast for better scalability and security; it remains the likely future transport if load grows. See [Subscribing to database changes](https://supabase.com/docs/guides/realtime/subscribing-to-database-changes).

Realtime events are invalidations, never the authoritative state. The client subscribes, waits for `SUBSCRIBED`, fetches a snapshot, briefly debounces duplicate table changes, rejects stale revisions, and resynchronizes on online/visibility/channel recovery. This avoids fragile client-side event replay and closes the fetch/subscribe race.

## Revision and idempotency

Every successful mutation increments `queues.revision` exactly once. Entry rows record the revision that changed them, and `queue_events` has a unique `(queue_id, queue_revision)` index. Every mutation carries a client UUID request ID. `queue_commands` binds it to queue, actor, and command type; exact replay returns current authoritative state, while actor/type reuse is rejected.

## Rejected approaches

- Direct table writes: cannot safely coordinate multi-row invariants and broaden grants.
- Client-only authorization: hidden controls and local flags are not security boundaries.
- Client-side event replay: reconnect gaps and duplicate/out-of-order messages make it fragile.
- Presence or heartbeat writes: no product requirement and needless quota consumption.
- Polling while connected: unnecessary traffic; snapshot fetches are event/recovery driven.

## Free-plan constraints and risks

As verified on 2026-07-17, [Supabase Free pricing](https://supabase.com/pricing) lists two active projects, 500 MB database size, 5 GB egress, and pausing after roughly one week of low activity. [Realtime pricing](https://supabase.com/docs/guides/realtime/pricing) and [limits](https://supabase.com/docs/guides/realtime/limits) remain quota-bound. No keep-alive, paid add-on, trial, or public deployment is part of Story 2.

Remaining hardening includes CAPTCHA or stronger anonymous abuse protection, cleanup of abandoned anonymous identities, capability rotation/recovery, more durable distributed attempt throttling, operational monitoring, data retention policy, and reassessment of Broadcast at scale. The current throttle is five failed attempts per user/queue/15-minute window with a 15-minute block; it is deliberately modest, not commercial brute-force protection.
