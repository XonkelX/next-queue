create or replace function private.queue_snapshot(target_queue_id uuid, actor uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  result jsonb;
  staff boolean := private.is_staff(target_queue_id, actor);
  own_entry_id uuid;
begin
  select entry.id into own_entry_id
  from public.queue_entries entry
  join public.queue_entry_private secret on secret.entry_id = entry.id
  where entry.queue_id = target_queue_id
    and secret.customer_user_id = actor
  order by entry.sequence desc
  limit 1;

  select jsonb_build_object(
    'ok', true,
    'queue', jsonb_build_object(
      'id', queue.id,
      'slug', queue.slug,
      'name', queue.name,
      'prefix', queue.prefix,
      'status', queue.status,
      'revision', queue.revision,
      'createdAt', queue.created_at,
      'updatedAt', queue.updated_at
    ),
    'entries', coalesce((
      select jsonb_agg(jsonb_strip_nulls(jsonb_build_object(
        'id', entry.id,
        'queueId', entry.queue_id,
        'number', entry.sequence,
        'numberLabel', entry.number_label,
        'status', entry.status,
        'displayName', case when staff or entry.id = own_entry_id then secret.display_name else null end,
        'joinedAt', entry.joined_at,
        'calledAt', entry.called_at,
        'completedAt', entry.completed_at,
        'skippedAt', entry.skipped_at,
        'updatedAt', entry.updated_at,
        'revision', entry.revision
      )) order by entry.sequence)
      from public.queue_entries entry
      left join public.queue_entry_private secret on secret.entry_id = entry.id
      where entry.queue_id = target_queue_id
        and (entry.id = own_entry_id or entry.status in ('WAITING', 'SERVING') or (staff and entry.updated_at > now() - interval '2 hours'))
    ), '[]'::jsonb),
    'role', case when staff then 'staff' when own_entry_id is not null then 'customer' else 'public' end,
    'ownEntryId', own_entry_id,
    'isOwner', queue.created_by = actor,
    'waitingCount', (select count(*) from public.queue_entries entry where entry.queue_id = target_queue_id and entry.status = 'WAITING'),
    'serverTime', now()
  ) into result
  from public.queues queue
  where queue.id = target_queue_id;

  return result;
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

  if (select count(*) from public.queue_commands where actor_user_id = actor and command_type = 'JOIN_QUEUE' and created_at > now() - interval '1 minute') >= 6 then
    return private.error_result('RATE_LIMITED', 'Please wait a minute before joining again.');
  end if;
  if (select count(*) from public.queue_entries where queue_id = target_queue.id and status = 'WAITING') >= 500 then
    return private.error_result('RATE_LIMITED', 'This queue is full. Please check with staff.');
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
    target_queue.prefix || '-' || lpad(reserved_sequence::text, greatest(3, length(reserved_sequence::text)), '0'), 'WAITING', new_revision
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
  if normalized_prefix is null or normalized_prefix !~ '^[A-Z]{1,3}$' then
    return private.error_result('INVALID_QUEUE_PREFIX', 'Use one to three letters for the queue prefix.');
  end if;
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended('create-queue:' || actor::text, 0));
  if (select count(*) from public.queues where created_by = actor and created_at > now() - interval '1 day') >= 10 then
    return private.error_result('RATE_LIMITED', 'You have reached the daily queue limit. Please use an existing queue.');
  end if;
  if (select count(*) from public.queues where created_by = actor and status <> 'CLOSED') >= 3 then
    return private.error_result('QUEUE_LIMIT_REACHED', 'This browser already has three active queues. Close a queue before creating another.');
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

