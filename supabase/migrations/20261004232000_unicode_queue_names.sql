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
  target_slug := coalesce(nullif(trim(both '-' from regexp_replace(lower(normalized_name), '[^a-z0-9]+', '-', 'g')), ''), 'queue')
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

