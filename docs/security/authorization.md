# Authorization and security

## Identity distinctions

- The publishable key identifies the public application and is safe in client configuration.
- Before sign-in, requests use PostgreSQL's `anon` role and receive no queue RPC grants.
- `signInAnonymously()` creates a real browser-scoped user UUID with no contact data.
- Anonymous users call the Data API as `authenticated`; RLS and RPCs derive identity from `auth.uid()`.
- The service-role key is not used by the Next.js application or browser.

## Staff capability claim

Queue creation generates 18 cryptographically random bytes, displays their hexadecimal representation once, and stores only `pgcrypto.crypt()` output with a bcrypt salt. Claim compares through `crypt(submitted, stored_hash) = stored_hash`, inserts a membership on success, and returns a generic failure otherwise. The code is never a URL value, event field, command value, log field, seed credential, or Realtime payload.

Five failed attempts by the same authenticated user against the same queue within 15 minutes cause a 15-minute database block. Raw attempts are not stored or exposed. This limits rapid single-identity guessing but is not IP-wide or distributed commercial protection; anonymous identity rotation remains a limitation. CAPTCHA/Turnstile and stronger edge rate limiting are production-hardening work.

## RLS and grants

RLS is enabled on every public table. Authenticated clients may select display-safe queues/entries. Customers can select their own private record; staff can select private records and limited events only for queues where membership exists. Membership enumeration is restricted to the caller. Access hashes, attempts, and command receipts have no client select policy. Only `queues` and `queue_entries` are in the Realtime publication.

All table writes are revoked from `anon` and `authenticated`. Clients cannot directly insert entries, change status/sequence/revision, grant membership, write hashes, record commands, or append events.

## Security-definer safeguards

Every exposed function revokes public/`anon` execution and grants only `authenticated`. Functions use `set search_path = ''`, fully qualified relations, `auth.uid()` instead of caller-supplied actors, explicit staff membership checks, row locks, domain-specific transitions, request-ID binding, and database constraints. Expected business failures return typed safe codes; SQL, constraint names, stack traces, hashes, and tokens are not returned.

## Known limitations

Anonymous identity cannot be recovered after site-data clearing or transferred automatically to another device. Automatic cleanup of abandoned anonymous Supabase users is not built in. Capability rotation/recovery, stronger abuse prevention, operational alerting, formal retention/deletion policy, penetration testing, and a production SLA are outside Story 2. This project claims no security certification.
