-- A 30-day rollout grace period lets the published policy precede any deletion.
create table private.retention_settings (
  singleton boolean primary key default true check (singleton),
  starts_at timestamptz not null default now() + interval '30 days'
);
insert into private.retention_settings(singleton) values (true);
revoke all on private.retention_settings from public, anon, authenticated, service_role;

create index queue_entries_retention_idx on public.queue_entries (queue_id, updated_at)
where status in ('COMPLETED', 'SKIPPED');

create or replace function private.prune_queue_history()
returns bigint
language plpgsql
security definer
set search_path = ''
as $$
declare
  target_queue uuid;
  expired_entries uuid[];
  removed bigint := 0;
  batch_count bigint;
  cutoff timestamptz := now() - interval '30 days';
begin
  if not exists (select 1 from private.retention_settings where starts_at <= now()) then
    return 0;
  end if;
  -- Serialize with queue commands, skip busy queues, and bound each run.
  for target_queue in
    select q.id from public.queues q
    where exists (
      select 1 from public.queue_entries e where e.queue_id = q.id
      and e.status in ('COMPLETED', 'SKIPPED') and e.updated_at < cutoff
    )
    order by q.updated_at limit 50 for update of q skip locked
  loop
    select array_agg(id) into expired_entries from (
      select id from public.queue_entries
      where queue_id = target_queue and status in ('COMPLETED', 'SKIPPED')
        and updated_at < cutoff
        and coalesce(completed_at, skipped_at) < cutoff
      order by updated_at limit 1000
    ) candidates;
    delete from public.queue_events where entry_id = any(expired_entries);
    -- Private names and customer associations cascade with their expired ticket.
    delete from public.queue_entries where id = any(expired_entries);
    get diagnostics batch_count = row_count;
    removed := removed + batch_count;
    if batch_count > 0 then
      update public.queues set revision = revision + 1, updated_at = now() where id = target_queue;
    end if;
  end loop;
  delete from public.queue_events where entry_id is null and occurred_at < cutoff;
  delete from private.queue_viewers where expires_at < now();
  delete from public.queue_staff_access_attempts
    where updated_at < now() - interval '1 day'
      and (blocked_until is null or blocked_until < now());
  -- Command IDs remain as replay tombstones: deleting them could execute a
  -- delayed retry twice. Queue settings, ownership and accounts are untouched.
  return removed;
end;
$$;
revoke all on function private.prune_queue_history() from public, anon, authenticated, service_role;

create extension if not exists pg_cron;
select cron.schedule('next-history-retention', '17 * * * *', 'select private.prune_queue_history()');
select cron.schedule('next-retention-job-logs', '47 3 * * *',
  $job$delete from cron.job_run_details where end_time < now() - interval '7 days'
  and jobid in (select jobid from cron.job where jobname in ('next-history-retention', 'next-retention-job-logs'))$job$);
