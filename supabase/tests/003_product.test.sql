begin;
create extension if not exists pgtap with schema extensions;
select plan(1);

-- Assertions abort the transaction on regression, including when run via the
-- management SQL API. All identities, tickets and credentials roll back.
insert into auth.users(id,aud,role,is_anonymous,created_at,updated_at)
values ('61000000-0000-4000-8000-000000000001','authenticated','authenticated',true,now(),now()),
('61000000-0000-4000-8000-000000000002','authenticated','authenticated',true,now(),now()),
('61000000-0000-4000-8000-000000000003','authenticated','authenticated',true,now(),now());
do $$
declare r jsonb; q uuid; slug text; code text; first_ticket uuid; second_ticket uuid; request uuid := gen_random_uuid();
begin
  perform set_config('request.jwt.claim.sub','61000000-0000-4000-8000-000000000001',true);
  assert public.create_queue('Invalid prefix',null,gen_random_uuid())->>'error' = 'INVALID_QUEUE_PREFIX', 'null prefix rejected';
  r := public.create_queue('Product regression','ABC',gen_random_uuid());
  assert r->>'ok' = 'true', 'queue created';
  assert r->>'isOwner' = 'true', 'creator identified';
  q := (r#>>'{queue,id}')::uuid; slug := r#>>'{queue,slug}'; code := r->>'accessCode';
  perform set_config('test.product_queue',q::text,true);
  perform set_config('test.product_slug',slug,true);
  assert jsonb_array_length(public.list_staff_queues()) = 1, 'saved queue listed';
  assert public.create_queue('Ññ','N',gen_random_uuid())->>'ok' = 'true', 'accent-only name gets valid slug';
  update public.queues set next_sequence = 1000 where id = q;
  perform set_config('request.jwt.claim.sub','61000000-0000-4000-8000-000000000002',true);
  r := public.join_queue(slug,'Private name',gen_random_uuid());
  assert r#>>'{entries,0,numberLabel}' = 'ABC-1000', 'four-digit ticket is not truncated';
  first_ticket := (r->>'ownEntryId')::uuid;
  assert public.rotate_staff_code(q,gen_random_uuid())->>'error' = 'NOT_STAFF', 'guest cannot rotate';
  perform set_config('request.jwt.claim.sub','61000000-0000-4000-8000-000000000003',true);
  assert public.leave_queue(q,first_ticket,gen_random_uuid())->>'error' = 'CONFLICT', 'guest cannot cancel another ticket';
  r := public.join_queue(slug,null,gen_random_uuid());
  second_ticket := (r->>'ownEntryId')::uuid;
  perform set_config('request.jwt.claim.sub','61000000-0000-4000-8000-000000000001',true);
  perform public.call_next(q,gen_random_uuid());
  r := public.complete_and_call_next(q,first_ticket,request);
  assert r->>'ok' = 'true', 'atomic complete succeeds';
  assert (select status = 'SERVING' from public.queue_entries where id = second_ticket), 'next ticket served';
  perform public.complete_and_call_next(q,first_ticket,request);
  assert (select status = 'SERVING' from public.queue_entries where id = second_ticket), 'replay does not complete successor';
  assert public.complete_and_call_next(q,first_ticket,gen_random_uuid())->>'error' = 'CONFLICT', 'stale staff click rejected';
  perform set_config('request.jwt.claim.sub','61000000-0000-4000-8000-000000000002',true);
  r := public.get_queue_snapshot(slug);
  assert r->>'ownEntryId' = first_ticket::text, 'completed ticket remains owned';
  assert r#>>'{entries,0,status}' = 'COMPLETED', 'completed status stays visible';
  r := public.join_queue(slug,null,gen_random_uuid());
  first_ticket := (r->>'ownEntryId')::uuid;
  r := public.leave_queue(q,first_ticket,gen_random_uuid());
  assert r->>'ok' = 'true', 'waiting customer cancels';
  assert (select status = 'SKIPPED' from public.queue_entries where id = first_ticket), 'cancelled ticket leaves line';
  perform public.claim_staff_access(slug,code,gen_random_uuid());
  assert private.is_staff(q,auth.uid()), 'second staff claims access';
  perform set_config('request.jwt.claim.sub','61000000-0000-4000-8000-000000000001',true);
  r := public.rotate_staff_code(q,gen_random_uuid());
  assert length(r->>'accessCode') = 36, 'replacement code returned once';
  assert not private.is_staff(q,'61000000-0000-4000-8000-000000000002'), 'other staff revoked';
  assert private.is_staff(q,auth.uid()), 'creator remains staff';
  perform set_config('request.jwt.claim.sub','61000000-0000-4000-8000-000000000002',true);
  assert public.claim_staff_access(slug,code,gen_random_uuid())->>'error' = 'INVALID_ACCESS_CODE', 'old code rejected';
  assert public.claim_staff_access(slug,r->>'accessCode',gen_random_uuid())->>'ok' = 'true', 'new code works';
end;
$$;

-- A fresh identity cannot enumerate another venue, but its link grants safe
-- state for both snapshots and the RLS-protected Realtime publication.
insert into auth.users(id,aud,role,is_anonymous,created_at,updated_at)
values ('61000000-0000-4000-8000-000000000004','authenticated','authenticated',true,now(),now());
set local role authenticated;
select set_config('request.jwt.claim.sub','61000000-0000-4000-8000-000000000004',true);
do $$ declare r jsonb; begin
  assert not exists(select 1 from public.queues where id = current_setting('test.product_queue')::uuid), 'queue cannot be enumerated';
  assert not exists(select 1 from public.queue_entries where queue_id = current_setting('test.product_queue')::uuid), 'tickets cannot be enumerated';
  r := public.get_queue_snapshot(current_setting('test.product_slug'));
  assert r->>'ok' = 'true', 'link grants snapshot';
  assert exists(select 1 from public.queues where id = current_setting('test.product_queue')::uuid), 'link grants realtime state';
  assert not exists(select 1 from public.queue_entry_private where queue_id = current_setting('test.product_queue')::uuid), 'private names remain hidden';
  assert not exists(select 1 from jsonb_array_elements(r->'entries') entry where entry ? 'displayName'), 'public snapshot has no names';
  assert jsonb_array_length(public.list_staff_queues()) = 0, 'saved list does not expose other staff queues';
end $$;
reset role;
select pass('Product reliability, access and privacy regression assertions');
select * from finish();
rollback;
