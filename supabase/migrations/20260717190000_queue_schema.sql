create extension if not exists pgcrypto with schema extensions;

create type public.queue_status as enum ('OPEN', 'PAUSED', 'CLOSED');
create type public.queue_entry_status as enum ('WAITING', 'SERVING', 'COMPLETED', 'SKIPPED');
create type public.queue_event_type as enum (
  'QUEUE_CREATED',
  'STAFF_ACCESS_CLAIMED',
  'CUSTOMER_JOINED',
  'CUSTOMER_CALLED',
  'CUSTOMER_COMPLETED',
  'CUSTOMER_SKIPPED',
  'QUEUE_PAUSED',
  'QUEUE_REOPENED',
  'QUEUE_CLOSED'
);

create table public.queues (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  prefix text not null,
  status public.queue_status not null default 'OPEN',
  next_sequence integer not null default 1,
  revision bigint not null default 0,
  created_by uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint queues_slug_format check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$' and length(slug) between 3 and 80),
  constraint queues_name_length check (length(btrim(name)) between 2 and 80 and name = btrim(name)),
  constraint queues_prefix_format check (prefix ~ '^[A-Z]{1,3}$'),
  constraint queues_next_sequence_positive check (next_sequence >= 1),
  constraint queues_revision_nonnegative check (revision >= 0)
);

create table public.queue_entries (
  id uuid primary key default gen_random_uuid(),
  queue_id uuid not null references public.queues(id) on delete restrict,
  sequence integer not null,
  number_label text not null,
  status public.queue_entry_status not null default 'WAITING',
  joined_at timestamptz not null default now(),
  called_at timestamptz,
  completed_at timestamptz,
  skipped_at timestamptz,
  updated_at timestamptz not null default now(),
  revision bigint not null,
  constraint queue_entries_sequence_positive check (sequence >= 1),
  constraint queue_entries_revision_nonnegative check (revision >= 0),
  constraint queue_entries_label_format check (number_label ~ '^[A-Z]{1,3}-[0-9]{3,}$'),
  constraint queue_entries_queue_sequence_unique unique (queue_id, sequence),
  constraint queue_entries_queue_label_unique unique (queue_id, number_label),
  constraint queue_entries_timestamp_state check (
    (status = 'WAITING' and called_at is null and completed_at is null and skipped_at is null)
    or (status = 'SERVING' and called_at is not null and completed_at is null and skipped_at is null)
    or (status = 'COMPLETED' and called_at is not null and completed_at is not null and skipped_at is null)
    or (status = 'SKIPPED' and skipped_at is not null and completed_at is null)
  )
);

create table public.queue_entry_private (
  entry_id uuid primary key references public.queue_entries(id) on delete cascade,
  queue_id uuid not null references public.queues(id) on delete restrict,
  customer_user_id uuid not null references auth.users(id) on delete restrict,
  display_name text,
  created_at timestamptz not null default now(),
  constraint queue_entry_private_name check (
    display_name is null or (display_name = btrim(display_name) and length(display_name) between 1 and 30)
  )
);

create table public.queue_staff_memberships (
  queue_id uuid not null references public.queues(id) on delete restrict,
  user_id uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  primary key (queue_id, user_id)
);

create table public.queue_staff_access (
  queue_id uuid primary key references public.queues(id) on delete restrict,
  code_hash text not null,
  updated_at timestamptz not null default now(),
  constraint queue_staff_access_hash_not_blank check (length(code_hash) >= 20)
);

create table public.queue_staff_access_attempts (
  queue_id uuid not null references public.queues(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  window_started_at timestamptz not null default now(),
  attempt_count integer not null default 0,
  blocked_until timestamptz,
  updated_at timestamptz not null default now(),
  primary key (queue_id, user_id),
  constraint queue_staff_attempt_count check (attempt_count >= 0)
);

create table public.queue_commands (
  request_id uuid primary key,
  queue_id uuid references public.queues(id) on delete restrict,
  actor_user_id uuid not null references auth.users(id) on delete restrict,
  command_type text not null,
  created_at timestamptz not null default now(),
  constraint queue_commands_type check (command_type in (
    'CREATE_QUEUE', 'CLAIM_STAFF_ACCESS', 'JOIN_QUEUE', 'CALL_NEXT',
    'COMPLETE_ACTIVE', 'SKIP_ENTRY', 'PAUSE_QUEUE', 'REOPEN_QUEUE', 'CLOSE_QUEUE'
  ))
);

create table public.queue_events (
  id bigint generated always as identity primary key,
  queue_id uuid not null references public.queues(id) on delete restrict,
  entry_id uuid references public.queue_entries(id) on delete restrict,
  event_type public.queue_event_type not null,
  queue_revision bigint not null,
  actor_user_id uuid references auth.users(id) on delete set null,
  request_id uuid not null unique references public.queue_commands(request_id) on delete restrict,
  occurred_at timestamptz not null default now(),
  constraint queue_events_revision_nonnegative check (queue_revision >= 0)
);

create index queues_slug_idx on public.queues (slug);
create index queue_entries_waiting_idx on public.queue_entries (queue_id, sequence) where status = 'WAITING';
create index queue_entries_status_idx on public.queue_entries (queue_id, status);
create unique index queue_entries_one_serving_idx on public.queue_entries (queue_id) where status = 'SERVING';
create index queue_entry_private_customer_idx on public.queue_entry_private (customer_user_id, queue_id);
create index queue_entry_private_queue_idx on public.queue_entry_private (queue_id);
create index queue_staff_memberships_user_idx on public.queue_staff_memberships (user_id, queue_id);
create index queue_staff_attempts_user_idx on public.queue_staff_access_attempts (user_id, queue_id);
create index queue_commands_queue_idx on public.queue_commands (queue_id, created_at desc);
create unique index queue_events_queue_revision_idx on public.queue_events (queue_id, queue_revision);

alter table public.queues enable row level security;
alter table public.queue_entries enable row level security;
alter table public.queue_entry_private enable row level security;
alter table public.queue_staff_memberships enable row level security;
alter table public.queue_staff_access enable row level security;
alter table public.queue_staff_access_attempts enable row level security;
alter table public.queue_commands enable row level security;
alter table public.queue_events enable row level security;

revoke all on all tables in schema public from anon, authenticated;
revoke all on all sequences in schema public from anon, authenticated;
grant usage on schema public to anon, authenticated;
grant select on public.queues, public.queue_entries to authenticated;
grant select on public.queue_entry_private, public.queue_staff_memberships, public.queue_events to authenticated;

create policy queues_authenticated_read on public.queues
  for select to authenticated using (true);
create policy queue_entries_authenticated_read on public.queue_entries
  for select to authenticated using (true);
create policy queue_private_owner_or_staff_read on public.queue_entry_private
  for select to authenticated using (
    customer_user_id = (select auth.uid())
    or exists (
      select 1 from public.queue_staff_memberships membership
      where membership.queue_id = queue_entry_private.queue_id
        and membership.user_id = (select auth.uid())
    )
  );
create policy queue_staff_memberships_self_read on public.queue_staff_memberships
  for select to authenticated using (user_id = (select auth.uid()));
create policy queue_events_staff_read on public.queue_events
  for select to authenticated using (
    exists (
      select 1 from public.queue_staff_memberships membership
      where membership.queue_id = queue_events.queue_id
        and membership.user_id = (select auth.uid())
    )
  );

create schema if not exists private;
revoke all on schema private from public, anon, authenticated;

create or replace function private.require_actor()
returns uuid
language plpgsql
stable
security invoker
set search_path = ''
as $$
declare
  actor uuid := auth.uid();
begin
  if actor is null then
    raise exception 'AUTH_REQUIRED' using errcode = 'P0001';
  end if;
  return actor;
end;
$$;

create or replace function private.is_staff(target_queue_id uuid, actor uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.queue_staff_memberships membership
    where membership.queue_id = target_queue_id and membership.user_id = actor
  );
$$;

create or replace function private.error_result(code text, message text)
returns jsonb
language sql
immutable
set search_path = ''
as $$
  select jsonb_build_object('ok', false, 'error', code, 'message', message);
$$;

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
    and entry.status in ('WAITING', 'SERVING')
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
        and (entry.status in ('WAITING', 'SERVING') or (staff and entry.updated_at > now() - interval '2 hours'))
    ), '[]'::jsonb),
    'role', case when staff then 'staff' when own_entry_id is not null then 'customer' else 'public' end,
    'ownEntryId', own_entry_id,
    'waitingCount', (select count(*) from public.queue_entries entry where entry.queue_id = target_queue_id and entry.status = 'WAITING'),
    'serverTime', now()
  ) into result
  from public.queues queue
  where queue.id = target_queue_id;

  return result;
end;
$$;

create or replace function public.get_queue_snapshot(queue_slug text)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  actor uuid := private.require_actor();
  target_queue_id uuid;
begin
  select id into target_queue_id from public.queues where slug = lower(btrim(queue_slug));
  if target_queue_id is null then
    return private.error_result('QUEUE_NOT_FOUND', 'This queue could not be found.');
  end if;
  return private.queue_snapshot(target_queue_id, actor);
end;
$$;

revoke all on function public.get_queue_snapshot(text) from public, anon;
grant execute on function public.get_queue_snapshot(text) to authenticated;

alter publication supabase_realtime add table public.queues;
alter publication supabase_realtime add table public.queue_entries;
