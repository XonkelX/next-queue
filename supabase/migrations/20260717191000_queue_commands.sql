create or replace function private.replayed_queue_id(
  p_request_id uuid,
  p_actor uuid,
  p_command_type text
)
returns uuid
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  receipt public.queue_commands%rowtype;
begin
  select * into receipt from public.queue_commands where request_id = p_request_id;
  if not found then
    return null;
  end if;
  if receipt.actor_user_id <> p_actor or receipt.command_type <> p_command_type then
    raise exception 'REQUEST_ID_MISMATCH' using errcode = 'P0001';
  end if;
  return receipt.queue_id;
end;
$$;

create or replace function public.create_queue(
  queue_name text,
  queue_prefix text,
  request_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor uuid := private.require_actor();
  normalized_name text := regexp_replace(btrim(queue_name), '\s+', ' ', 'g');
  normalized_prefix text := upper(btrim(queue_prefix));
  target_queue_id uuid;
  target_slug text;
  access_code text;
  replay_queue_id uuid;
  result jsonb;
begin
  replay_queue_id := private.replayed_queue_id(request_id, actor, 'CREATE_QUEUE');
  if replay_queue_id is not null then
    return private.queue_snapshot(replay_queue_id, actor) || jsonb_build_object('replayed', true, 'accessCode', null);
  end if;
  if normalized_name is null or length(normalized_name) not between 2 and 80 then
    return private.error_result('INVALID_QUEUE_NAME', 'Use a queue name between 2 and 80 characters.');
  end if;
  if normalized_prefix !~ '^[A-Z]{1,3}$' then
    return private.error_result('INVALID_QUEUE_PREFIX', 'Use one to three letters for the queue prefix.');
  end if;
  if (select count(*) from public.queues where created_by = actor and status <> 'CLOSED') >= 3 then
    return private.error_result('QUEUE_LIMIT_REACHED', 'This browser already has three active demonstration queues.');
  end if;

  target_queue_id := gen_random_uuid();
  target_slug := trim(both '-' from regexp_replace(lower(normalized_name), '[^a-z0-9]+', '-', 'g'))
    || '-' || substring(replace(target_queue_id::text, '-', '') from 1 for 8);
  if length(target_slug) > 80 then
    target_slug := substring(target_slug from 1 for 71) || '-' || substring(replace(target_queue_id::text, '-', '') from 1 for 8);
  end if;
  access_code := upper(encode(extensions.gen_random_bytes(18), 'hex'));

  insert into public.queues (id, slug, name, prefix, status, next_sequence, revision, created_by)
  values (target_queue_id, target_slug, normalized_name, normalized_prefix, 'OPEN', 1, 1, actor);
  insert into public.queue_staff_memberships (queue_id, user_id) values (target_queue_id, actor);
  insert into public.queue_staff_access (queue_id, code_hash)
  values (target_queue_id, extensions.crypt(access_code, extensions.gen_salt('bf', 10)));
  insert into public.queue_commands (request_id, queue_id, actor_user_id, command_type)
  values (request_id, target_queue_id, actor, 'CREATE_QUEUE');
  insert into public.queue_events (queue_id, event_type, queue_revision, actor_user_id, request_id)
  values (target_queue_id, 'QUEUE_CREATED', 1, actor, request_id);

  result := private.queue_snapshot(target_queue_id, actor);
  return result || jsonb_build_object('accessCode', access_code, 'accessCodeShownOnce', true);
end;
$$;

create or replace function public.claim_staff_access(
  queue_slug text,
  access_code text,
  request_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor uuid := private.require_actor();
  target_queue public.queues%rowtype;
  stored_hash text;
  attempt public.queue_staff_access_attempts%rowtype;
  replay_queue_id uuid;
  new_revision bigint;
begin
  select * into target_queue from public.queues where slug = lower(btrim(queue_slug)) for update;
  if not found then
    return private.error_result('INVALID_ACCESS_CODE', 'That access code could not be verified.');
  end if;
  replay_queue_id := private.replayed_queue_id(request_id, actor, 'CLAIM_STAFF_ACCESS');
  if replay_queue_id is not null then
    return private.queue_snapshot(replay_queue_id, actor) || jsonb_build_object('replayed', true);
  end if;
  if private.is_staff(target_queue.id, actor) then
    insert into public.queue_commands (request_id, queue_id, actor_user_id, command_type)
    values (request_id, target_queue.id, actor, 'CLAIM_STAFF_ACCESS');
    return private.queue_snapshot(target_queue.id, actor) || jsonb_build_object('replayed', true);
  end if;

  select * into attempt from public.queue_staff_access_attempts
  where queue_id = target_queue.id and user_id = actor for update;
  if found and attempt.blocked_until is not null and attempt.blocked_until > now() then
    return private.error_result('RATE_LIMITED', 'Too many attempts. Wait before trying again.');
  end if;
  select code_hash into stored_hash from public.queue_staff_access where queue_id = target_queue.id;
  if stored_hash is null or access_code is null or length(access_code) > 128
    or extensions.crypt(access_code, stored_hash) <> stored_hash then
    insert into public.queue_staff_access_attempts (
      queue_id, user_id, window_started_at, attempt_count, blocked_until, updated_at
    ) values (
      target_queue.id, actor, now(), 1, null, now()
    ) on conflict (queue_id, user_id) do update set
      window_started_at = case
        when public.queue_staff_access_attempts.window_started_at < now() - interval '15 minutes' then now()
        else public.queue_staff_access_attempts.window_started_at end,
      attempt_count = case
        when public.queue_staff_access_attempts.window_started_at < now() - interval '15 minutes' then 1
        else public.queue_staff_access_attempts.attempt_count + 1 end,
      blocked_until = case
        when (case when public.queue_staff_access_attempts.window_started_at < now() - interval '15 minutes' then 1 else public.queue_staff_access_attempts.attempt_count + 1 end) >= 5
        then now() + interval '15 minutes' else null end,
      updated_at = now();
    if (select attempt_count >= 5 from public.queue_staff_access_attempts where queue_id = target_queue.id and user_id = actor) then
      return private.error_result('RATE_LIMITED', 'Too many attempts. Wait before trying again.');
    end if;
    return private.error_result('INVALID_ACCESS_CODE', 'That access code could not be verified.');
  end if;

  delete from public.queue_staff_access_attempts where queue_id = target_queue.id and user_id = actor;
  insert into public.queue_staff_memberships (queue_id, user_id) values (target_queue.id, actor);
  update public.queues set revision = revision + 1, updated_at = now()
  where id = target_queue.id returning revision into new_revision;
  insert into public.queue_commands (request_id, queue_id, actor_user_id, command_type)
  values (request_id, target_queue.id, actor, 'CLAIM_STAFF_ACCESS');
  insert into public.queue_events (queue_id, event_type, queue_revision, actor_user_id, request_id)
  values (target_queue.id, 'STAFF_ACCESS_CLAIMED', new_revision, actor, request_id);
  return private.queue_snapshot(target_queue.id, actor);
end;
$$;

create or replace function public.join_queue(
  queue_slug text,
  display_name text,
  request_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor uuid := private.require_actor();
  target_queue public.queues%rowtype;
  normalized_name text := nullif(regexp_replace(btrim(display_name), '\s+', ' ', 'g'), '');
  active_id uuid;
  entry_id uuid := gen_random_uuid();
  reserved_sequence integer;
  new_revision bigint;
  replay_queue_id uuid;
begin
  select * into target_queue from public.queues where slug = lower(btrim(queue_slug)) for update;
  if not found then return private.error_result('QUEUE_NOT_FOUND', 'This queue could not be found.'); end if;
  replay_queue_id := private.replayed_queue_id(request_id, actor, 'JOIN_QUEUE');
  if replay_queue_id is not null then
    return private.queue_snapshot(replay_queue_id, actor) || jsonb_build_object('replayed', true);
  end if;
  if target_queue.status = 'PAUSED' then return private.error_result('QUEUE_PAUSED', 'Check-in is paused.'); end if;
  if target_queue.status = 'CLOSED' then return private.error_result('QUEUE_CLOSED', 'This queue is closed.'); end if;
  if normalized_name is not null and length(normalized_name) > 30 then
    return private.error_result('INVALID_DISPLAY_NAME', 'Use 30 characters or fewer.');
  end if;
  select entry.id into active_id
  from public.queue_entries entry
  join public.queue_entry_private secret on secret.entry_id = entry.id
  where entry.queue_id = target_queue.id and secret.customer_user_id = actor
    and entry.status in ('WAITING', 'SERVING')
  limit 1;
  if active_id is not null then
    insert into public.queue_commands (request_id, queue_id, actor_user_id, command_type)
    values (request_id, target_queue.id, actor, 'JOIN_QUEUE');
    return private.queue_snapshot(target_queue.id, actor) || jsonb_build_object('alreadyJoined', true);
  end if;

  update public.queues set
    next_sequence = next_sequence + 1,
    revision = revision + 1,
    updated_at = now()
  where id = target_queue.id
  returning next_sequence - 1, revision into reserved_sequence, new_revision;
  insert into public.queue_entries (
    id, queue_id, sequence, number_label, status, revision
  ) values (
    entry_id, target_queue.id, reserved_sequence,
    target_queue.prefix || '-' || lpad(reserved_sequence::text, 3, '0'), 'WAITING', new_revision
  );
  insert into public.queue_entry_private (entry_id, queue_id, customer_user_id, display_name)
  values (entry_id, target_queue.id, actor, normalized_name);
  insert into public.queue_commands (request_id, queue_id, actor_user_id, command_type)
  values (request_id, target_queue.id, actor, 'JOIN_QUEUE');
  insert into public.queue_events (queue_id, entry_id, event_type, queue_revision, actor_user_id, request_id)
  values (target_queue.id, entry_id, 'CUSTOMER_JOINED', new_revision, actor, request_id);
  return private.queue_snapshot(target_queue.id, actor);
end;
$$;

create or replace function public.call_next(queue_id uuid, request_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor uuid := private.require_actor();
  target_queue public.queues%rowtype;
  target_entry_id uuid;
  new_revision bigint;
  replay_queue_id uuid;
begin
  select * into target_queue from public.queues where id = queue_id for update;
  if not found then return private.error_result('QUEUE_NOT_FOUND', 'This queue could not be found.'); end if;
  if not private.is_staff(queue_id, actor) then return private.error_result('NOT_STAFF', 'Staff access is required.'); end if;
  replay_queue_id := private.replayed_queue_id(request_id, actor, 'CALL_NEXT');
  if replay_queue_id is not null then return private.queue_snapshot(replay_queue_id, actor) || jsonb_build_object('replayed', true); end if;
  if target_queue.status <> 'OPEN' then return private.error_result(case when target_queue.status = 'PAUSED' then 'QUEUE_PAUSED' else 'QUEUE_CLOSED' end, 'Open the queue before calling the next customer.'); end if;
  if exists (select 1 from public.queue_entries entry where entry.queue_id = target_queue.id and entry.status = 'SERVING') then
    return private.error_result('ACTIVE_ENTRY_EXISTS', 'Complete or skip the active customer first.');
  end if;
  select entry.id into target_entry_id from public.queue_entries entry
  where entry.queue_id = target_queue.id and entry.status = 'WAITING' order by entry.sequence limit 1 for update;
  if target_entry_id is null then return private.error_result('EMPTY_QUEUE', 'No customers are waiting.'); end if;
  update public.queues set revision = revision + 1, updated_at = now() where id = target_queue.id returning revision into new_revision;
  update public.queue_entries set status = 'SERVING', called_at = now(), updated_at = now(), revision = new_revision where id = target_entry_id;
  insert into public.queue_commands (request_id, queue_id, actor_user_id, command_type) values (request_id, target_queue.id, actor, 'CALL_NEXT');
  insert into public.queue_events (queue_id, entry_id, event_type, queue_revision, actor_user_id, request_id)
  values (target_queue.id, target_entry_id, 'CUSTOMER_CALLED', new_revision, actor, request_id);
  return private.queue_snapshot(target_queue.id, actor);
end;
$$;

create or replace function public.complete_active(queue_id uuid, request_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor uuid := private.require_actor(); target_queue public.queues%rowtype; target_entry_id uuid; new_revision bigint; replay_queue_id uuid;
begin
  select * into target_queue from public.queues where id = queue_id for update;
  if not found then return private.error_result('QUEUE_NOT_FOUND', 'This queue could not be found.'); end if;
  if not private.is_staff(queue_id, actor) then return private.error_result('NOT_STAFF', 'Staff access is required.'); end if;
  replay_queue_id := private.replayed_queue_id(request_id, actor, 'COMPLETE_ACTIVE');
  if replay_queue_id is not null then return private.queue_snapshot(replay_queue_id, actor) || jsonb_build_object('replayed', true); end if;
  select entry.id into target_entry_id from public.queue_entries entry where entry.queue_id = target_queue.id and entry.status = 'SERVING' for update;
  if target_entry_id is null then return private.error_result('CONFLICT', 'No customer is currently being served.'); end if;
  update public.queues set revision = revision + 1, updated_at = now() where id = target_queue.id returning revision into new_revision;
  update public.queue_entries set status = 'COMPLETED', completed_at = now(), updated_at = now(), revision = new_revision where id = target_entry_id;
  insert into public.queue_commands (request_id, queue_id, actor_user_id, command_type) values (request_id, target_queue.id, actor, 'COMPLETE_ACTIVE');
  insert into public.queue_events (queue_id, entry_id, event_type, queue_revision, actor_user_id, request_id)
  values (target_queue.id, target_entry_id, 'CUSTOMER_COMPLETED', new_revision, actor, request_id);
  return private.queue_snapshot(target_queue.id, actor);
end;
$$;

create or replace function public.skip_entry(queue_id uuid, entry_id uuid, request_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor uuid := private.require_actor(); target_queue public.queues%rowtype; target_status public.queue_entry_status; new_revision bigint; replay_queue_id uuid;
begin
  select * into target_queue from public.queues where id = queue_id for update;
  if not found then return private.error_result('QUEUE_NOT_FOUND', 'This queue could not be found.'); end if;
  if not private.is_staff(queue_id, actor) then return private.error_result('NOT_STAFF', 'Staff access is required.'); end if;
  replay_queue_id := private.replayed_queue_id(request_id, actor, 'SKIP_ENTRY');
  if replay_queue_id is not null then return private.queue_snapshot(replay_queue_id, actor) || jsonb_build_object('replayed', true); end if;
  select entry.status into target_status from public.queue_entries entry where entry.id = entry_id and entry.queue_id = target_queue.id for update;
  if target_status is null then return private.error_result('CONFLICT', 'That queue entry no longer exists.'); end if;
  if target_status not in ('WAITING', 'SERVING') then return private.error_result('CONFLICT', 'That queue entry can no longer be skipped.'); end if;
  update public.queues set revision = revision + 1, updated_at = now() where id = target_queue.id returning revision into new_revision;
  update public.queue_entries set status = 'SKIPPED', skipped_at = now(), updated_at = now(), revision = new_revision where id = entry_id;
  insert into public.queue_commands (request_id, queue_id, actor_user_id, command_type) values (request_id, target_queue.id, actor, 'SKIP_ENTRY');
  insert into public.queue_events (queue_id, entry_id, event_type, queue_revision, actor_user_id, request_id)
  values (target_queue.id, entry_id, 'CUSTOMER_SKIPPED', new_revision, actor, request_id);
  return private.queue_snapshot(target_queue.id, actor);
end;
$$;

create or replace function private.change_queue_status(
  p_queue_id uuid,
  p_request_id uuid,
  p_command_type text,
  p_allowed_from public.queue_status[],
  p_target public.queue_status,
  p_event public.queue_event_type
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor uuid := private.require_actor(); target_queue public.queues%rowtype; new_revision bigint; replay_queue_id uuid;
begin
  select * into target_queue from public.queues where id = p_queue_id for update;
  if not found then return private.error_result('QUEUE_NOT_FOUND', 'This queue could not be found.'); end if;
  if not private.is_staff(p_queue_id, actor) then return private.error_result('NOT_STAFF', 'Staff access is required.'); end if;
  replay_queue_id := private.replayed_queue_id(p_request_id, actor, p_command_type);
  if replay_queue_id is not null then return private.queue_snapshot(replay_queue_id, actor) || jsonb_build_object('replayed', true); end if;
  if not (target_queue.status = any(p_allowed_from)) then return private.error_result('CONFLICT', 'That queue status change is not allowed.'); end if;
  update public.queues set status = p_target, revision = revision + 1, updated_at = now() where id = p_queue_id returning revision into new_revision;
  insert into public.queue_commands (request_id, queue_id, actor_user_id, command_type) values (p_request_id, p_queue_id, actor, p_command_type);
  insert into public.queue_events (queue_id, event_type, queue_revision, actor_user_id, request_id)
  values (p_queue_id, p_event, new_revision, actor, p_request_id);
  return private.queue_snapshot(p_queue_id, actor);
end;
$$;

create or replace function public.pause_queue(queue_id uuid, request_id uuid) returns jsonb
language sql security definer set search_path = '' as $$
  select private.change_queue_status(queue_id, request_id, 'PAUSE_QUEUE', array['OPEN'::public.queue_status], 'PAUSED', 'QUEUE_PAUSED');
$$;
create or replace function public.reopen_queue(queue_id uuid, request_id uuid) returns jsonb
language sql security definer set search_path = '' as $$
  select private.change_queue_status(queue_id, request_id, 'REOPEN_QUEUE', array['PAUSED'::public.queue_status], 'OPEN', 'QUEUE_REOPENED');
$$;
create or replace function public.close_queue(queue_id uuid, request_id uuid) returns jsonb
language sql security definer set search_path = '' as $$
  select private.change_queue_status(queue_id, request_id, 'CLOSE_QUEUE', array['OPEN'::public.queue_status, 'PAUSED'::public.queue_status], 'CLOSED', 'QUEUE_CLOSED');
$$;

revoke all on function public.create_queue(text, text, uuid) from public, anon;
revoke all on function public.claim_staff_access(text, text, uuid) from public, anon;
revoke all on function public.join_queue(text, text, uuid) from public, anon;
revoke all on function public.call_next(uuid, uuid) from public, anon;
revoke all on function public.complete_active(uuid, uuid) from public, anon;
revoke all on function public.skip_entry(uuid, uuid, uuid) from public, anon;
revoke all on function public.pause_queue(uuid, uuid) from public, anon;
revoke all on function public.reopen_queue(uuid, uuid) from public, anon;
revoke all on function public.close_queue(uuid, uuid) from public, anon;
grant execute on function public.create_queue(text, text, uuid) to authenticated;
grant execute on function public.claim_staff_access(text, text, uuid) to authenticated;
grant execute on function public.join_queue(text, text, uuid) to authenticated;
grant execute on function public.call_next(uuid, uuid) to authenticated;
grant execute on function public.complete_active(uuid, uuid) to authenticated;
grant execute on function public.skip_entry(uuid, uuid, uuid) to authenticated;
grant execute on function public.pause_queue(uuid, uuid) to authenticated;
grant execute on function public.reopen_queue(uuid, uuid) to authenticated;
grant execute on function public.close_queue(uuid, uuid) to authenticated;
