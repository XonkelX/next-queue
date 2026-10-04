-- Links grant access to public queue state, not discovery of every venue.
create table private.queue_viewers (
  queue_id uuid not null references public.queues(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  expires_at timestamptz not null default now() + interval '7 days',
  primary key (queue_id, user_id)
);
revoke all on private.queue_viewers from public, anon, authenticated;

create or replace function public.can_read_queue(target_queue_id uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select private.is_staff(target_queue_id, auth.uid()) or exists (
    select 1 from private.queue_viewers
    where queue_id = target_queue_id and user_id = auth.uid() and expires_at > now()
  );
$$;
revoke all on function public.can_read_queue(uuid) from public, anon;
grant execute on function public.can_read_queue(uuid) to authenticated;
alter policy queues_authenticated_read on public.queues using (public.can_read_queue(id));
alter policy queue_entries_authenticated_read on public.queue_entries using (public.can_read_queue(queue_id));

create or replace function public.get_queue_snapshot(queue_slug text)
returns jsonb language plpgsql volatile security definer set search_path = '' as $$
declare actor uuid := private.require_actor(); target_queue_id uuid;
begin
  select id into target_queue_id from public.queues where slug = lower(btrim(queue_slug));
  if target_queue_id is null then return private.error_result('QUEUE_NOT_FOUND', 'This queue could not be found.'); end if;
  insert into private.queue_viewers(queue_id, user_id) values (target_queue_id, actor)
  on conflict (queue_id, user_id) do update set expires_at = now() + interval '7 days'
    where private.queue_viewers.expires_at < now() + interval '1 day';
  return private.queue_snapshot(target_queue_id, actor);
end;
$$;

create or replace function public.list_staff_queues()
returns jsonb language sql stable security definer set search_path = '' as $$
  select coalesce(jsonb_agg(row_to_json(q) order by q.updated_at desc), '[]'::jsonb)
  from (select queue.id, queue.slug, queue.name, queue.status, queue.updated_at,
    (queue.created_by = auth.uid()) as is_owner
    from public.queues queue join public.queue_staff_memberships membership on membership.queue_id = queue.id
    where membership.user_id = auth.uid() order by queue.updated_at desc limit 50) q;
$$;
revoke all on function public.list_staff_queues() from public, anon;
grant execute on function public.list_staff_queues() to authenticated;

-- Complete and advance under the same queue lock and transaction. The expected
-- ticket prevents another staff member's stale click from completing its successor.
create or replace function public.complete_and_call_next(queue_id uuid, expected_entry_id uuid, request_id uuid)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare actor uuid := private.require_actor(); q public.queues%rowtype; result jsonb; replay uuid;
begin
  select * into q from public.queues where id = queue_id for update;
  if not found then return private.error_result('QUEUE_NOT_FOUND', 'This queue could not be found.'); end if;
  if not private.is_staff(q.id, actor) then return private.error_result('NOT_STAFF', 'Staff access is required.'); end if;
  replay := private.replayed_queue_id(request_id, actor, 'COMPLETE_ACTIVE');
  if replay is not null then return private.queue_snapshot(replay, actor); end if;
  if not exists(select 1 from public.queue_entries where id = expected_entry_id and queue_entries.queue_id = q.id and status = 'SERVING') then
    return private.error_result('CONFLICT', 'This ticket has already changed. Review the current customer.');
  end if;
  result := public.complete_active(q.id, request_id);
  if not (result->>'ok')::boolean then return result; end if;
  if q.status = 'OPEN' and exists(select 1 from public.queue_entries where queue_entries.queue_id = q.id and status = 'WAITING') then
    result := public.call_next(q.id, gen_random_uuid());
    if not (result->>'ok')::boolean then raise exception 'Atomic advance failed'; end if;
  end if;
  return private.queue_snapshot(q.id, actor);
end;
$$;
revoke all on function public.complete_and_call_next(uuid,uuid,uuid) from public, anon;
grant execute on function public.complete_and_call_next(uuid,uuid,uuid) to authenticated;

alter table public.queue_commands drop constraint queue_commands_type;
alter table public.queue_commands add constraint queue_commands_type check (command_type in (
  'CREATE_QUEUE','CLAIM_STAFF_ACCESS','JOIN_QUEUE','CALL_NEXT','COMPLETE_ACTIVE',
  'SKIP_ENTRY','PAUSE_QUEUE','REOPEN_QUEUE','CLOSE_QUEUE','LEAVE_QUEUE','ROTATE_STAFF_CODE'
));

create or replace function public.leave_queue(queue_id uuid, entry_id uuid, request_id uuid)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare actor uuid := private.require_actor(); q public.queues%rowtype; new_revision bigint; replay uuid;
begin
  select * into q from public.queues where id = queue_id for update;
  if not found then return private.error_result('QUEUE_NOT_FOUND', 'This queue could not be found.'); end if;
  replay := private.replayed_queue_id(request_id, actor, 'LEAVE_QUEUE');
  if replay is not null then return private.queue_snapshot(replay, actor); end if;
  if not exists(select 1 from public.queue_entry_private p where p.entry_id = leave_queue.entry_id and p.queue_id = q.id and p.customer_user_id = actor) then
    return private.error_result('CONFLICT', 'This ticket does not belong to this browser.');
  end if;
  if not exists(select 1 from public.queue_entries e where e.id = entry_id and e.status = 'WAITING') then
    return private.error_result('CONFLICT', 'Only a waiting ticket can be cancelled.');
  end if;
  update public.queues set revision = queues.revision + 1, updated_at = now() where id = q.id returning queues.revision into new_revision;
  update public.queue_entries set status = 'SKIPPED', skipped_at = now(), updated_at = now(), revision = new_revision where id = entry_id;
  insert into public.queue_commands(request_id,queue_id,actor_user_id,command_type) values(request_id,q.id,actor,'LEAVE_QUEUE');
  insert into public.queue_events(queue_id,entry_id,event_type,queue_revision,actor_user_id,request_id)
    values(q.id,entry_id,'CUSTOMER_SKIPPED',new_revision,actor,request_id);
  return private.queue_snapshot(q.id,actor);
end;
$$;
revoke all on function public.leave_queue(uuid,uuid,uuid) from public, anon;
grant execute on function public.leave_queue(uuid,uuid,uuid) to authenticated;

create or replace function public.rotate_staff_code(queue_id uuid, request_id uuid)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare actor uuid := private.require_actor(); q public.queues%rowtype; code text; replay uuid;
begin
  select * into q from public.queues where id = queue_id for update;
  if not found then return private.error_result('QUEUE_NOT_FOUND', 'This queue could not be found.'); end if;
  if q.created_by <> actor then return private.error_result('NOT_STAFF', 'Only the queue creator can replace staff access.'); end if;
  replay := private.replayed_queue_id(request_id, actor, 'ROTATE_STAFF_CODE');
  if replay is not null then return private.queue_snapshot(q.id,actor) || jsonb_build_object('accessCode',null); end if;
  code := upper(encode(extensions.gen_random_bytes(18),'hex'));
  update public.queue_staff_access set code_hash = extensions.crypt(code,extensions.gen_salt('bf',10)), updated_at = now() where queue_staff_access.queue_id = q.id;
  delete from public.queue_staff_memberships where queue_staff_memberships.queue_id = q.id and user_id <> actor;
  update public.queues set revision = queues.revision + 1, updated_at = now() where id = q.id;
  insert into public.queue_commands(request_id,queue_id,actor_user_id,command_type) values(request_id,q.id,actor,'ROTATE_STAFF_CODE');
  return private.queue_snapshot(q.id,actor) || jsonb_build_object('accessCode',code);
end;
$$;
revoke all on function public.rotate_staff_code(uuid,uuid) from public, anon;
grant execute on function public.rotate_staff_code(uuid,uuid) to authenticated;
