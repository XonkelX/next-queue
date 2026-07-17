import { createClient } from '@supabase/supabase-js';
import { beforeAll, describe, expect, it } from 'vitest';
import type { Database, Json } from '@/lib/supabase/database.types';

function requiredEnvironment(name: string) {
  const value = process.env[name];
  if (!value)
    throw new Error(`Local Supabase test configuration ${name} is missing.`);
  return value;
}

const url = requiredEnvironment('NEXT_PUBLIC_SUPABASE_URL');
const key = requiredEnvironment('NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY');

function isolatedClient() {
  return createClient<Database>(url, key, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  });
}

function record(value: Json | null) {
  if (!value || Array.isArray(value) || typeof value !== 'object')
    throw new Error('Expected an RPC object result.');
  return value;
}

async function anonymousClient() {
  const client = isolatedClient();
  const { error } = await client.auth.signInAnonymously();
  if (error) throw error;
  return client;
}

describe('persistent queue engine', () => {
  let creator: ReturnType<typeof isolatedClient>;
  let staff: ReturnType<typeof isolatedClient>;
  let customerOne: ReturnType<typeof isolatedClient>;
  let customerTwo: ReturnType<typeof isolatedClient>;
  let slug: string;
  let queueId: string;
  let accessCode: string;

  beforeAll(async () => {
    [creator, staff, customerOne, customerTwo] = await Promise.all([
      anonymousClient(),
      anonymousClient(),
      anonymousClient(),
      anonymousClient(),
    ]);
    const { data, error } = await creator.rpc('create_queue', {
      queue_name: 'Integration Counter',
      queue_prefix: 'I',
      request_id: crypto.randomUUID(),
    });
    if (error) throw error;
    const created = record(data);
    slug = String((created.queue as Record<string, Json>).slug);
    queueId = String((created.queue as Record<string, Json>).id);
    accessCode = String(created.accessCode);
  });

  it('initializes four isolated anonymous identities', async () => {
    const ids = await Promise.all(
      [creator, staff, customerOne, customerTwo].map(
        async (client) => (await client.auth.getUser()).data.user?.id,
      ),
    );
    expect(new Set(ids).size).toBe(4);
  });

  it('creates a persistent queue and creator staff membership', async () => {
    const snapshot = record(
      (await creator.rpc('get_queue_snapshot', { queue_slug: slug })).data,
    );
    expect(snapshot.role).toBe('staff');
    expect((snapshot.queue as Record<string, Json>).revision).toBe(1);
    expect(accessCode).toMatch(/^[A-F0-9]{36}$/);
  });

  it('serializes simultaneous queue creation with one request ID', async () => {
    const sharedRequestId = crypto.randomUUID();
    const [first, second] = await Promise.all([
      creator.rpc('create_queue', {
        queue_name: 'Retry-safe Counter',
        queue_prefix: 'R',
        request_id: sharedRequestId,
      }),
      creator.rpc('create_queue', {
        queue_name: 'Retry-safe Counter',
        queue_prefix: 'R',
        request_id: sharedRequestId,
      }),
    ]);
    if (first.error) throw first.error;
    if (second.error) throw second.error;
    const results = [record(first.data), record(second.data)];
    expect(
      new Set(
        results.map((result) =>
          String((result.queue as Record<string, Json>).id),
        ),
      ).size,
    ).toBe(1);
    expect(results.filter((result) => result.replayed === true)).toHaveLength(
      1,
    );
  });

  it('claims staff access in a second identity', async () => {
    const result = record(
      (
        await staff.rpc('claim_staff_access', {
          queue_slug: slug,
          access_code: accessCode,
          request_id: crypto.randomUUID(),
        })
      ).data,
    );
    expect(result.ok).toBe(true);
    expect(result.role).toBe('staff');
  });

  it('joins customers with unique monotonic labels', async () => {
    const first = record(
      (
        await customerOne.rpc('join_queue', {
          queue_slug: slug,
          display_name: 'River',
          request_id: crypto.randomUUID(),
        })
      ).data,
    );
    const second = record(
      (
        await customerTwo.rpc('join_queue', {
          queue_slug: slug,
          display_name: 'Sky',
          request_id: crypto.randomUUID(),
        })
      ).data,
    );
    expect((first.entries as Record<string, Json>[])[0]?.numberLabel).toBe(
      'I-001',
    );
    expect((second.entries as Record<string, Json>[])[1]?.numberLabel).toBe(
      'I-002',
    );
  });

  it('separates public and staff snapshot names', async () => {
    const publicClient = await anonymousClient();
    const publicSnapshot = record(
      (await publicClient.rpc('get_queue_snapshot', { queue_slug: slug })).data,
    );
    const staffSnapshot = record(
      (await staff.rpc('get_queue_snapshot', { queue_slug: slug })).data,
    );
    expect(
      (publicSnapshot.entries as Record<string, Json>[]).every(
        (entry) => !('displayName' in entry),
      ),
    ).toBe(true);
    expect(
      (staffSnapshot.entries as Record<string, Json>[]).map(
        (entry) => entry.displayName,
      ),
    ).toEqual(['River', 'Sky']);
  });

  it('denies direct writes and non-staff commands', async () => {
    const direct = await customerOne.from('queue_entries').insert({
      queue_id: queueId,
      sequence: 99,
      number_label: 'I-099',
      revision: 99,
    });
    const command = record(
      (
        await customerOne.rpc('call_next', {
          queue_id: queueId,
          request_id: crypto.randomUUID(),
        })
      ).data,
    );
    expect(direct.error?.code).toBe('42501');
    expect(command.error).toBe('NOT_STAFF');
  });

  it('serializes simultaneous call-next commands', async () => {
    const [first, second] = await Promise.all([
      creator.rpc('call_next', {
        queue_id: queueId,
        request_id: crypto.randomUUID(),
      }),
      staff.rpc('call_next', {
        queue_id: queueId,
        request_id: crypto.randomUUID(),
      }),
    ]);
    const results = [record(first.data), record(second.data)];
    expect(results.filter((result) => result.ok === true)).toHaveLength(1);
    expect(
      results.filter((result) => result.error === 'ACTIVE_ENTRY_EXISTS'),
    ).toHaveLength(1);
    const snapshot = record(
      (await staff.rpc('get_queue_snapshot', { queue_slug: slug })).data,
    );
    expect(
      (snapshot.entries as Record<string, Json>[]).filter(
        (entry) => entry.status === 'SERVING',
      ),
    ).toHaveLength(1);
  });

  it('reuses command request IDs without repeating side effects', async () => {
    const requestId = crypto.randomUUID();
    const before = record(
      (await staff.rpc('get_queue_snapshot', { queue_slug: slug })).data,
    );
    await staff.rpc('complete_active', {
      queue_id: queueId,
      request_id: requestId,
    });
    const repeated = record(
      (
        await staff.rpc('complete_active', {
          queue_id: queueId,
          request_id: requestId,
        })
      ).data,
    );
    expect(repeated.replayed).toBe(true);
    expect(Number((repeated.queue as Record<string, Json>).revision)).toBe(
      Number((before.queue as Record<string, Json>).revision) + 1,
    );
  });

  it('enforces request ID actor binding', async () => {
    const shared = crypto.randomUUID();
    await creator.rpc('pause_queue', { queue_id: queueId, request_id: shared });
    const mismatch = await staff.rpc('pause_queue', {
      queue_id: queueId,
      request_id: shared,
    });
    expect(mismatch.error?.message).toContain('REQUEST_ID_MISMATCH');
  });

  it('persists the final authoritative revision across a fresh client', async () => {
    const fresh = await anonymousClient();
    const snapshot = record(
      (await fresh.rpc('get_queue_snapshot', { queue_slug: slug })).data,
    );
    expect((snapshot.queue as Record<string, Json>).status).toBe('PAUSED');
    expect(
      Number((snapshot.queue as Record<string, Json>).revision),
    ).toBeGreaterThan(1);
  });
});
