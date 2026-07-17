begin;
create extension if not exists pgtap with schema extensions;
select plan(35);

insert into auth.users (instance_id, id, aud, role, raw_app_meta_data, raw_user_meta_data, created_at, updated_at, is_anonymous)
values
  ('00000000-0000-0000-0000-000000000000', '41000000-0000-4000-8000-000000000001', 'authenticated', 'authenticated', '{"provider":"anonymous"}', '{}', now(), now(), true),
  ('00000000-0000-0000-0000-000000000000', '41000000-0000-4000-8000-000000000002', 'authenticated', 'authenticated', '{"provider":"anonymous"}', '{}', now(), now(), true),
  ('00000000-0000-0000-0000-000000000000', '41000000-0000-4000-8000-000000000003', 'authenticated', 'authenticated', '{"provider":"anonymous"}', '{}', now(), now(), true),
  ('00000000-0000-0000-0000-000000000000', '41000000-0000-4000-8000-000000000004', 'authenticated', 'authenticated', '{"provider":"anonymous"}', '{}', now(), now(), true);

set local role authenticated;
select set_config('request.jwt.claim.sub', '41000000-0000-4000-8000-000000000001', true);
do $$
declare result jsonb;
begin
  result := public.create_queue('Test Counter', 'T', '42000000-0000-4000-8000-000000000001');
  perform set_config('test.queue_id', result #>> '{queue,id}', true);
  perform set_config('test.queue_slug', result #>> '{queue,slug}', true);
  perform set_config('test.access_code', result ->> 'accessCode', true);
end;
$$;

select ok(current_setting('test.queue_id')::uuid is not null, 'authenticated user creates a queue');
select ok(exists (select 1 from public.queue_staff_memberships where queue_id = current_setting('test.queue_id')::uuid and user_id = auth.uid()), 'creator becomes staff');
reset role;
select isnt(
  (select code_hash from public.queue_staff_access where queue_id = current_setting('test.queue_id')::uuid),
  current_setting('test.access_code'),
  'stored staff credential is a hash'
);
set local role authenticated;
select set_config('request.jwt.claim.sub', '41000000-0000-4000-8000-000000000001', true);
select is(
  (public.create_queue('Test Counter', 'T', '42000000-0000-4000-8000-000000000001')->>'replayed')::boolean,
  true,
  'duplicate create request is idempotent'
);
select is(
  public.create_queue('Bad Prefix', 'T1', '42000000-0000-4000-8000-000000000002')->>'error',
  'INVALID_QUEUE_PREFIX',
  'invalid prefix is rejected'
);

select set_config('request.jwt.claim.sub', '41000000-0000-4000-8000-000000000003', true);
select is(
  public.join_queue(current_setting('test.queue_slug'), '  Casey  ', '43000000-0000-4000-8000-000000000001')->>'ok',
  'true',
  'customer joins an open queue'
);
select is((select display_name from public.queue_entry_private where customer_user_id = auth.uid()), 'Casey', 'display name is normalized privately');
select is(public.join_queue(current_setting('test.queue_slug'), 'Casey', '43000000-0000-4000-8000-000000000001')->>'replayed', 'true', 'join retry is idempotent');
select is((public.get_queue_snapshot(current_setting('test.queue_slug')) #>> '{role}'), 'customer', 'owner snapshot identifies customer role');
select is((public.get_queue_snapshot(current_setting('test.queue_slug')) #>> '{entries,0,displayName}'), 'Casey', 'owner sees own optional name');

select set_config('request.jwt.claim.sub', '41000000-0000-4000-8000-000000000004', true);
select is((public.get_queue_snapshot(current_setting('test.queue_slug')) #>> '{entries,0,displayName}'), null, 'public snapshot excludes another customer name');
select is(public.call_next(current_setting('test.queue_id')::uuid, '44000000-0000-4000-8000-000000000001')->>'error', 'NOT_STAFF', 'customer cannot call staff RPC');
select is(public.claim_staff_access(current_setting('test.queue_slug'), 'incorrect', '45000000-0000-4000-8000-000000000001')->>'error', 'INVALID_ACCESS_CODE', 'invalid staff code is generic');

select set_config('request.jwt.claim.sub', '41000000-0000-4000-8000-000000000002', true);
select is(public.claim_staff_access(current_setting('test.queue_slug'), current_setting('test.access_code'), '45000000-0000-4000-8000-000000000002')->>'ok', 'true', 'valid staff code grants membership');
select ok(exists (select 1 from public.queue_staff_memberships where queue_id = current_setting('test.queue_id')::uuid and user_id = auth.uid()), 'claimed user is staff');
select is((public.get_queue_snapshot(current_setting('test.queue_slug')) #>> '{entries,0,displayName}'), 'Casey', 'staff snapshot includes optional name');
select is(public.call_next(current_setting('test.queue_id')::uuid, '44000000-0000-4000-8000-000000000002') #>> '{entries,0,status}', 'SERVING', 'call next serves earliest waiting entry');
select is((select count(*)::integer from public.queue_entries where queue_id = current_setting('test.queue_id')::uuid and status = 'SERVING'), 1, 'only one entry is serving');
select is(public.call_next(current_setting('test.queue_id')::uuid, '44000000-0000-4000-8000-000000000002')->>'replayed', 'true', 'call retry is idempotent');
select is((select revision::integer from public.queues where id = current_setting('test.queue_id')::uuid), 4, 'claim, join, and call each increment revision once');
select is(public.complete_active(current_setting('test.queue_id')::uuid, '46000000-0000-4000-8000-000000000001') #>> '{entries,0,status}', 'COMPLETED', 'active entry completes');
select is(public.complete_active(current_setting('test.queue_id')::uuid, '46000000-0000-4000-8000-000000000001')->>'replayed', 'true', 'complete retry is idempotent');

select set_config('request.jwt.claim.sub', '41000000-0000-4000-8000-000000000003', true);
select is(public.join_queue(current_setting('test.queue_slug'), null, '43000000-0000-4000-8000-000000000002')->>'ok', 'true', 'customer can rejoin after terminal state');
select set_config('request.jwt.claim.sub', '41000000-0000-4000-8000-000000000002', true);
select is(public.skip_entry(current_setting('test.queue_id')::uuid, (select id from public.queue_entries where queue_id = current_setting('test.queue_id')::uuid and status = 'WAITING'), '47000000-0000-4000-8000-000000000001') #>> '{entries,1,status}', 'SKIPPED', 'waiting entry can be skipped');
select is(public.skip_entry(current_setting('test.queue_id')::uuid, (select id from public.queue_entries where queue_id = current_setting('test.queue_id')::uuid and status = 'SKIPPED'), '47000000-0000-4000-8000-000000000001')->>'replayed', 'true', 'skip retry is idempotent');
select is(public.pause_queue(current_setting('test.queue_id')::uuid, '48000000-0000-4000-8000-000000000001') #>> '{queue,status}', 'PAUSED', 'open queue pauses');
select is(public.pause_queue(current_setting('test.queue_id')::uuid, '48000000-0000-4000-8000-000000000001')->>'replayed', 'true', 'pause retry is idempotent');
select throws_ok(
  $$select public.close_queue(current_setting('test.queue_id')::uuid, '48000000-0000-4000-8000-000000000001')$$,
  '22023',
  'REQUEST_ID_MISMATCH',
  'request ID cannot be reused for another command type'
);

select set_config('request.jwt.claim.sub', '41000000-0000-4000-8000-000000000004', true);
select is(public.join_queue(current_setting('test.queue_slug'), null, '43000000-0000-4000-8000-000000000003')->>'error', 'QUEUE_PAUSED', 'paused queue rejects join');
select set_config('request.jwt.claim.sub', '41000000-0000-4000-8000-000000000002', true);
select is(public.reopen_queue(current_setting('test.queue_id')::uuid, '48000000-0000-4000-8000-000000000002') #>> '{queue,status}', 'OPEN', 'paused queue reopens');
select is(public.close_queue(current_setting('test.queue_id')::uuid, '48000000-0000-4000-8000-000000000003') #>> '{queue,status}', 'CLOSED', 'open queue closes');
select is(public.close_queue(current_setting('test.queue_id')::uuid, '48000000-0000-4000-8000-000000000003')->>'replayed', 'true', 'close retry is idempotent');
select is(public.reopen_queue(current_setting('test.queue_id')::uuid, '48000000-0000-4000-8000-000000000004')->>'error', 'CONFLICT', 'closed queue cannot reopen');

select throws_ok(
  $$insert into public.queue_entries (queue_id, sequence, number_label, status, revision) values (current_setting('test.queue_id')::uuid, 99, 'T-099', 'WAITING', 99)$$,
  '42501',
  'permission denied for table queue_entries',
  'direct entry insert is denied'
);
select throws_ok(
  $$update public.queues set revision = 999 where id = current_setting('test.queue_id')::uuid$$,
  '42501',
  'permission denied for table queues',
  'direct queue update is denied'
);

select * from finish();
rollback;
