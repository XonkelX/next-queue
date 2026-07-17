-- Local-only synthetic identity used to own the deterministic visual-test queue.
-- It has no email, password, reusable credential, or recoverable staff code.
insert into auth.users (
  instance_id,
  id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  raw_app_meta_data,
  raw_user_meta_data,
  created_at,
  updated_at,
  is_anonymous
) values (
  '00000000-0000-0000-0000-000000000000',
  '10000000-0000-4000-8000-000000000001',
  'authenticated',
  'authenticated',
  null,
  null,
  '2026-07-17T14:00:00Z',
  '{"provider":"anonymous","providers":["anonymous"]}',
  '{}',
  '2026-07-17T14:00:00Z',
  '2026-07-17T14:00:00Z',
  true
);

insert into public.queues (
  id, slug, name, prefix, status, next_sequence, revision, created_by, created_at, updated_at
) values (
  '20000000-0000-4000-8000-000000000001',
  'north-star-cafe',
  'North Star Café',
  'A',
  'OPEN',
  1,
  1,
  '10000000-0000-4000-8000-000000000001',
  '2026-07-17T14:00:00Z',
  '2026-07-17T14:00:00Z'
);

insert into public.queue_staff_memberships (queue_id, user_id, created_at)
values (
  '20000000-0000-4000-8000-000000000001',
  '10000000-0000-4000-8000-000000000001',
  '2026-07-17T14:00:00Z'
);

insert into public.queue_staff_access (queue_id, code_hash, updated_at)
values (
  '20000000-0000-4000-8000-000000000001',
  extensions.crypt(encode(extensions.gen_random_bytes(24), 'hex'), extensions.gen_salt('bf', 10)),
  '2026-07-17T14:00:00Z'
);

insert into public.queue_commands (request_id, queue_id, actor_user_id, command_type, created_at)
values (
  '30000000-0000-4000-8000-000000000001',
  '20000000-0000-4000-8000-000000000001',
  '10000000-0000-4000-8000-000000000001',
  'CREATE_QUEUE',
  '2026-07-17T14:00:00Z'
);

insert into public.queue_events (
  queue_id, event_type, queue_revision, actor_user_id, request_id, occurred_at
) values (
  '20000000-0000-4000-8000-000000000001',
  'QUEUE_CREATED',
  1,
  '10000000-0000-4000-8000-000000000001',
  '30000000-0000-4000-8000-000000000001',
  '2026-07-17T14:00:00Z'
);
