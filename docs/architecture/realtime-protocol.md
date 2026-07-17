# Realtime protocol

## Subscription lifecycle

1. Reuse or create one anonymous browser session.
2. Fetch a preliminary snapshot only to discover the queue UUID.
3. Open one deterministic `queue:<uuid>:changes` channel.
4. Subscribe to `queues.id = <uuid>` and `queue_entries.queue_id = <uuid>`.
5. Wait for `SUBSCRIBED`.
6. Fetch and publish a fresh authoritative snapshot.
7. Treat later changes as debounced invalidation signals.

This subscribe-then-snapshot publication order prevents an update between initial discovery and live subscription from being missed.

## Connection states

`CONNECTING`, `CONNECTED`, `RECONNECTING`, `OFFLINE`, and `ERROR` map to calm readable interface states. Brief channel errors are reconnecting, not alarming failures. The adapter removes its channel and event listeners when the route unmounts.

## Invalidations and revisions

Queue and entry messages from one transaction can arrive rapidly, so a 75 ms debounce produces one snapshot request. A refresh already in flight queues at most one follow-up. Lower revisions are ignored; equal revisions are ignored during ordinary invalidation; higher revisions replace state. Recovery refreshes may reassert an equal revision but never downgrade. Because every invalidation retrieves full state, detected revision gaps converge without event replay.

## Resync triggers

- initial `SUBSCRIBED`
- browser `online`
- channel resubscription/recovery
- tab visibility return after more than five seconds hidden
- any queue/entry invalidation, including a revision gap

There is no healthy-connection polling, Presence, global schema channel, custom heartbeat write, or private-table subscription.

## Commands and retry

A new user intent gets a UUID request ID. Automatic retry must retain that UUID. The RPC validates actor/type reuse, performs its transaction, and returns a snapshot. Buttons show local pending feedback but do not invent an authoritative result. Typed conflicts restore the control and explain the recoverable state. Realtime is confirmation/invalidation; the RPC result may update the UI immediately.

Development-only instrumentation reports sanitized subscription status, refresh reason, and current revision. It never logs access codes, customer names, tokens, or Realtime payloads and is omitted from production mode.
