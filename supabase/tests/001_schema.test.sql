begin;
create extension if not exists pgtap with schema extensions;
select plan(27);

select has_type('public', 'queue_status', 'queue status enum exists');
select has_type('public', 'queue_entry_status', 'entry status enum exists');
select has_type('public', 'queue_event_type', 'event type enum exists');

select has_table('public', 'queues', 'queues exists');
select has_table('public', 'queue_entries', 'queue entries exists');
select has_table('public', 'queue_entry_private', 'private entries exists');
select has_table('public', 'queue_staff_memberships', 'staff memberships exists');
select has_table('public', 'queue_staff_access', 'staff access exists');
select has_table('public', 'queue_staff_access_attempts', 'staff attempts exists');
select has_table('public', 'queue_commands', 'command receipts exist');
select has_table('public', 'queue_events', 'events exist');

select has_index('public', 'queues', 'queues_slug_idx', 'slug index exists');
select has_index('public', 'queue_entries', 'queue_entries_waiting_idx', 'waiting order index exists');
select has_index('public', 'queue_entries', 'queue_entries_status_idx', 'status index exists');
select has_index('public', 'queue_entries', 'queue_entries_one_serving_idx', 'one-serving partial index exists');
select has_index('public', 'queue_entry_private', 'queue_entry_private_customer_idx', 'customer ownership index exists');
select has_index('public', 'queue_staff_memberships', 'queue_staff_memberships_user_idx', 'staff lookup index exists');
select has_index('public', 'queue_events', 'queue_events_queue_revision_idx', 'event revision index exists');

select ok((select relrowsecurity from pg_class where oid = 'public.queues'::regclass), 'queues RLS enabled');
select ok((select relrowsecurity from pg_class where oid = 'public.queue_entries'::regclass), 'entries RLS enabled');
select ok((select relrowsecurity from pg_class where oid = 'public.queue_entry_private'::regclass), 'private entries RLS enabled');
select ok((select relrowsecurity from pg_class where oid = 'public.queue_staff_memberships'::regclass), 'memberships RLS enabled');
select ok((select relrowsecurity from pg_class where oid = 'public.queue_staff_access'::regclass), 'access hash RLS enabled');
select ok((select relrowsecurity from pg_class where oid = 'public.queue_staff_access_attempts'::regclass), 'attempts RLS enabled');
select ok((select relrowsecurity from pg_class where oid = 'public.queue_commands'::regclass), 'commands RLS enabled');
select ok((select relrowsecurity from pg_class where oid = 'public.queue_events'::regclass), 'events RLS enabled');

select is(
  (select array_agg(schemaname || '.' || tablename order by schemaname, tablename)
   from pg_publication_tables where pubname = 'supabase_realtime'),
  array['public.queue_entries', 'public.queues'],
  'only display-safe tables are published'
);
select * from finish();
rollback;
