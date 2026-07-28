import type { SupabaseClient } from '@supabase/supabase-js';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Database } from './database.types';
import {
  AnonymousSessionError,
  ensureAnonymousSession,
  resetAnonymousSessionForTests,
} from './session';

beforeEach(resetAnonymousSessionForTests);

function client(existing = false) {
  const user = { id: '60000000-0000-4000-8000-000000000001' };
  const value = {
    auth: {
      getUser: vi.fn(async () => ({
        data: { user: existing ? user : null },
        error: existing ? null : { message: 'session missing' },
      })),
      signInAnonymously: vi.fn(async () => ({ data: { user }, error: null })),
    },
  };
  return { value, typed: value as unknown as SupabaseClient<Database> };
}

describe('ensureAnonymousSession', () => {
  it('reuses an existing browser session', async () => {
    const fake = client(true);
    await expect(ensureAnonymousSession(fake.typed)).resolves.toMatchObject({
      id: expect.any(String),
    });
    expect(fake.value.auth.signInAnonymously).not.toHaveBeenCalled();
  });

  it('deduplicates simultaneous anonymous initialization', async () => {
    const fake = client();
    const [first, second] = await Promise.all([
      ensureAnonymousSession(fake.typed),
      ensureAnonymousSession(fake.typed),
    ]);
    expect(first.id).toBe(second.id);
    expect(fake.value.auth.signInAnonymously).toHaveBeenCalledTimes(1);
  });

  it('revalidates a resolved session before the next operation', async () => {
    const fake = client(true);
    await ensureAnonymousSession(fake.typed);
    fake.value.auth.getUser.mockResolvedValueOnce({
      data: { user: null },
      error: { message: 'session missing' },
    });

    await expect(ensureAnonymousSession(fake.typed)).resolves.toMatchObject({
      id: expect.any(String),
    });
    expect(fake.value.auth.getUser).toHaveBeenCalledTimes(2);
    expect(fake.value.auth.signInAnonymously).toHaveBeenCalledTimes(1);
  });

  it('surfaces a typed recoverable initialization error', async () => {
    const fake = client();
    fake.value.auth.signInAnonymously.mockResolvedValueOnce({
      data: { user: null } as never,
      error: { message: 'failed' } as never,
    });
    await expect(ensureAnonymousSession(fake.typed)).rejects.toBeInstanceOf(
      AnonymousSessionError,
    );
  });
});
