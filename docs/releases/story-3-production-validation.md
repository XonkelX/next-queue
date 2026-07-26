# Story 3 production validation

Validated on 2026-07-17 against [next-queue-omega.vercel.app](https://next-queue-omega.vercel.app).

## Deployment architecture

- Vercel Hobby project `next-queue`, connected only to `XonkelX/next-queue`
- production branch `main`, repository root, Next.js preset, Node.js 22.x, standard build
- one existing Supabase Free project in `us-east-1`
- filtered Realtime publication containing only `queues` and `queue_entries`
- Web Analytics and Speed Insights disabled; no custom domain, paid analytics, paid storage, add-on, trial, or payment method

Production has only the following public client configuration, scoped to Production (values intentionally omitted):

```text
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
```

The application runtime has no service-role key, database password, Supabase access token, or other server credential.

## Production QA

One synthetic queue, `North Star Café QA`, was used. Separate browser contexts represented two staff members, five customers, and a public display; nine contexts were connected at the busiest point. Queue creation and anonymous sign-in persisted across refresh. A second staff identity was denied before authorization, received a generic invalid-code error, then successfully claimed membership; the code disappeared from the form and never appeared in a URL.

Customer numbers were unique and ordered. Staff, customers, and display converged without refresh for join, call, complete, skip, pause, reopen, and close. Pausing denied new joins while allowing active service to finish; reopening restored joins; closing denied joins and calls. Terminal entries did not return after every surface was reloaded.

Two authorized staff issued call-next actions nearly concurrently. Exactly one waiting entry became serving, the other command received the expected conflict, and both screens converged without violating the one-serving invariant. Remote same-request-ID validation produced one side effect and one revision increment, and mismatched command reuse was rejected.

While a display was offline, staff changed queue state. Restoring connectivity triggered an authoritative snapshot, returned the indicator to connected, showed the latest revision, and introduced no duplicate entries. This exercise exposed and fixed a stale reconnect indicator; a regression test now covers the successful online refresh transition.

## Privacy and security inspection

Public snapshots and rendered display state contained queue numbers, not customer UUIDs or private names. The display had no private-table subscription. Page HTML contained no authentication token, private name, or staff code. Eleven production JavaScript bundles were scanned for service credentials and QA secrets with zero matches. No raw code appeared in a URL, report, commit, or PR text. Browser console and page-error collection found zero errors or warnings relevant to hydration, subscriptions, promises, or logging.

Database validation reconfirmed RLS, RPC-only writes, cross-queue staff isolation, staff-code hashing, private-name ownership, idempotency, and exact Realtime publication. The public client cannot query internal command receipts or security-sensitive tables.

## Accessibility, responsive, and motion results

Keyboard-only navigation, skip link, visible focus, mobile navigation, labeled access-code and join forms, command pending states, status announcements, focus retention, offline/reconnect messaging, dark theme, and 200% zoom were manually checked. No focus theft or focus loss occurred during Realtime changes. Queue status does not rely on color alone.

Automated Axe checks covered home, demo, about, customer, staff, and display routes: zero serious and zero critical findings. Widths 320, 375, 768, 1024, and 1440 px had no horizontal overflow or clipped controls. The public display was also checked at 1920×1080. Reduced-motion mode removed translation/stagger behavior while keeping state visible and interactive. New items animated once; unchanged snapshots and reconnect did not replay the queue.

## Automated and release validation

- Vitest: 33 passed
- pgTAP: 62 passed
- integration: 11 passed
- Realtime: 9 passed
- Playwright application suite: 15 passed
- production QA smoke with temporary queue: 13 passed, 0 skipped; its temporary anonymous identities were removed during cleanup
- formatting, lint, typecheck, clean database reset, database lint, generated types, production build, audit (0 vulnerabilities), and diff checks passed
- Story 2 post-merge GitHub Actions: quality, database, and browser jobs passed

The ongoing production smoke suite is read-only and is not part of ordinary PR CI. Browser checks cover only public pages; an optional temporary queue slug adds server-rendered HTTP health checks without starting an anonymous browser session.

## Cleanup

The synthetic queue and all related private entries, memberships, access records, attempts, commands, and events were removed. Final counts were zero for all eight application tables: `queues`, `queue_entries`, `queue_entry_private`, `queue_staff_memberships`, `queue_staff_access`, `queue_staff_access_attempts`, `queue_commands`, and `queue_events`. Twenty-three temporary anonymous users were removed during full QA and two more during final post-restore smoke validation, leaving zero Auth users. All QA browser sessions were closed and the one-time staff credential was discarded.

## Final revalidation

On 2026-07-25, the complete suite was rerun before opening the Story 3 PR. Newly published advisories were resolved by updating Next.js to 16.2.12 and pinning patched transitive Sharp and Minimatch versions; `npm audit` returned zero vulnerabilities. Supabase had automatically paused the inactive Free project as documented. The existing project was restored without an upgrade or payment, returned to `ACTIVE_HEALTHY`, and passed anonymous Auth and production route validation. The production smoke suite then passed 10 tests; one display-only test was skipped because the temporary QA queue had already been deleted. Final cleanup again confirmed zero rows in all eight application tables and zero Auth users. Final review hardened the ongoing smoke suite to avoid browser navigation to queue routes, which creates anonymous identities by design; the current read-only suite passes 9 tests and leaves no remote records.

## Free-tier limitations and remaining risks

- Supabase may pause an inactive Free project, causing a cold start or temporary unavailability.
- Supabase Free and Vercel Hobby impose finite database, bandwidth, connection, build, and function quotas.
- Anonymous ownership and staff membership are lost when the browser session or site data is cleared.
- A lost one-time staff code cannot be recovered; access depends on an existing authorized session or the saved code.
- Access-attempt throttling is not a substitute for a WAF, bot management, or advanced abuse protection.
- The architecture is suitable for small queues, not unbounded concurrent clients or enterprise-scale workloads without capacity planning.
- The portfolio deployment has no commercial uptime, support, backup, or recovery SLA.
