# Product scope

## User problem

Small service teams need a clear shared answer to three questions: who is waiting, who is being served, and who is next. Paper lists and shouted names are hard to follow; large administrative systems add cost and complexity that these teams do not need.

## Version 1

Version 1 contains exactly three product surfaces:

1. Customer check-in and personal queue position
2. Staff queue board
3. Public display

It supports one queue and one location, the `WAITING → SERVING → COMPLETED` or `SKIPPED` workflow, queue creation, joining, calling next, completing, skipping, pausing/closing, synchronized connected screens, reconnect/resync, visible connection state, responsive light/dark presentation, accessibility, and reduced motion.

Queue numbers use a configurable prefix and monotonically increasing integer, formatted as `A-001`. A name is optional. No contact or demographic data is collected.

## Non-goals

Permanent email/password or social accounts, organizations, teams, billing, subscriptions, customer accounts, email, SMS, push, AI, analytics, reports, calendars, payments, uploads, multiple locations, inventory, appointments, schedules, settings systems, role management, a marketing CMS, and native mobile apps are outside Version 1. Anonymous browser identity and queue-specific staff capability membership are implementation security mechanisms, not account-management features.

## Primary workflows

- A customer joins an open queue and receives the next unique number.
- Staff completes or skips any active entry, then calls the earliest waiting entry.
- Customer and display clients receive the authoritative new state.
- A disconnected client clearly reports its state, reconnects with backoff, and resyncs a complete snapshot.
- A paused or closed queue gives a precise message and blocks joining.
- An empty staff queue disables `Call next` and explains why.

## Definition of done

Version 1 is done when all three surfaces are polished and understandable, domain invariants hold under concurrent commands, connected screens synchronize and recover, accessibility and narrow responsive QA pass, free-tier operation is verified without payment information, CI is green, production security is reviewed, and documentation does not overstate capabilities.

Story 1 satisfies the visual and domain foundation. Story 2 implements persistent PostgreSQL state, anonymous identity, transactional commands, database authorization, filtered Realtime invalidation, revisioned snapshots, reconnect convergence, and local multi-client validation. Public application deployment and production operations remain explicitly out of scope.
