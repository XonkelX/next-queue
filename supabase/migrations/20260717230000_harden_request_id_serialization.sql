create or replace function private.replayed_queue_id(
  p_request_id uuid,
  p_actor uuid,
  p_command_type text
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  receipt public.queue_commands%rowtype;
begin
  if p_request_id is null then
    raise exception using errcode = '22023', message = 'REQUEST_ID_REQUIRED';
  end if;

  -- Serialize every use of one request UUID, including CREATE_QUEUE where no
  -- queue row exists yet to provide the normal transaction lock.
  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(p_request_id::text, 0)
  );

  select * into receipt
  from public.queue_commands
  where request_id = p_request_id;

  if not found then return null; end if;
  if receipt.actor_user_id <> p_actor or receipt.command_type <> p_command_type then
    raise exception using errcode = '22023', message = 'REQUEST_ID_MISMATCH';
  end if;
  return receipt.queue_id;
end;
$$;
