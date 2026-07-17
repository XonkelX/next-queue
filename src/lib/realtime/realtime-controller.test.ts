import { waitFor } from '@testing-library/react';
import type { SupabaseClient } from '@supabase/supabase-js';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Database, Json } from '@/lib/supabase/database.types';
import { resetAnonymousSessionForTests } from '@/lib/supabase/session';
import { RevisionGate, SupabaseQueueAdapter } from './supabase-adapter';

function snapshot(revision: number): Json {
  return {
    ok: true,
    queue: {
      id: '50000000-0000-4000-8000-000000000001',
      slug: 'test-queue',
      name: 'Test Queue',
      prefix: 'T',
      status: 'OPEN',
      revision,
      createdAt: '2026-07-17T00:00:00Z',
      updatedAt: '2026-07-17T00:00:00Z',
    },
    entries: [],
    role: 'public',
    ownEntryId: null,
    waitingCount: 0,
    serverTime: '2026-07-17T00:00:00Z',
  };
}

class FakeChannel {
  changes: Array<() => void> = [];
  status:
    | ((
        status: 'SUBSCRIBED' | 'CHANNEL_ERROR' | 'TIMED_OUT' | 'CLOSED',
      ) => void)
    | undefined;

  on(_kind: string, _filter: object, callback: () => void) {
    this.changes.push(callback);
    return this;
  }

  subscribe(callback: FakeChannel['status']) {
    this.status = callback;
    queueMicrotask(() => callback?.('SUBSCRIBED'));
    return this;
  }

  invalidate() {
    this.changes.forEach((callback) => callback());
  }
}

function fakeClient(revisions: number[]) {
  const channel = new FakeChannel();
  const rpc = vi.fn(async () => ({
    data: snapshot(revisions.shift() ?? 0),
    error: null,
  }));
  const client = {
    auth: {
      getSession: vi.fn(async () => ({
        data: {
          session: { user: { id: '51000000-0000-4000-8000-000000000001' } },
        },
        error: null,
      })),
      signInAnonymously: vi.fn(),
    },
    rpc,
    channel: vi.fn(() => channel),
    removeChannel: vi.fn(async () => 'ok'),
  };
  return {
    channel,
    rpc,
    removeChannel: client.removeChannel,
    client: client as unknown as SupabaseClient<Database>,
  };
}

beforeEach(() => {
  resetAnonymousSessionForTests();
  vi.useRealTimers();
});

describe('Realtime invalidation and convergence', () => {
  it('accepts only authoritative non-stale revisions', () => {
    const gate = new RevisionGate();
    const revisionTwo = { queue: { revision: 2 } } as never;
    const revisionOne = { queue: { revision: 1 } } as never;
    expect(gate.accept(revisionTwo)).toBe(true);
    expect(gate.accept(revisionTwo)).toBe(false);
    expect(gate.accept(revisionOne, true)).toBe(false);
    expect(gate.current()).toBe(2);
  });

  it('subscribes before publishing the authoritative initial snapshot', async () => {
    const fake = fakeClient([1, 2]);
    const revisions: number[] = [];
    const states: string[] = [];
    const cleanup = await new SupabaseQueueAdapter(fake.client).subscribe(
      'test-queue',
      {
        onSnapshot: (value) => revisions.push(value.queue.revision),
        onConnectionState: (state) => states.push(state),
        onError: vi.fn(),
      },
    );
    await waitFor(() => expect(revisions).toEqual([2]));
    expect(states).toContain('connected');
    expect(fake.rpc).toHaveBeenCalledTimes(2);
    await cleanup();
  });

  it('debounces duplicate queue and entry invalidations into one refresh', async () => {
    vi.useFakeTimers();
    const fake = fakeClient([1, 2, 3]);
    const onSnapshot = vi.fn();
    const cleanup = await new SupabaseQueueAdapter(fake.client).subscribe(
      'test-queue',
      {
        onSnapshot,
        onConnectionState: vi.fn(),
        onError: vi.fn(),
      },
    );
    await vi.runAllTicks();
    await vi.advanceTimersByTimeAsync(1);
    fake.channel.invalidate();
    fake.channel.invalidate();
    await vi.advanceTimersByTimeAsync(75);
    expect(fake.rpc).toHaveBeenCalledTimes(3);
    expect(onSnapshot.mock.calls.at(-1)?.[0].queue.revision).toBe(3);
    await cleanup();
  });

  it('ignores a stale snapshot returned after a later revision', async () => {
    vi.useFakeTimers();
    const fake = fakeClient([4, 5, 3]);
    const onSnapshot = vi.fn();
    const cleanup = await new SupabaseQueueAdapter(fake.client).subscribe(
      'test-queue',
      {
        onSnapshot,
        onConnectionState: vi.fn(),
        onError: vi.fn(),
      },
    );
    await vi.runAllTicks();
    await vi.advanceTimersByTimeAsync(1);
    fake.channel.invalidate();
    await vi.advanceTimersByTimeAsync(75);
    expect(onSnapshot).toHaveBeenCalledTimes(1);
    expect(onSnapshot.mock.calls[0]?.[0].queue.revision).toBe(5);
    await cleanup();
  });

  it('resynchronizes when the browser returns online', async () => {
    const fake = fakeClient([1, 2, 4]);
    const onSnapshot = vi.fn();
    const states: string[] = [];
    const cleanup = await new SupabaseQueueAdapter(fake.client).subscribe(
      'test-queue',
      {
        onSnapshot,
        onConnectionState: (state) => states.push(state),
        onError: vi.fn(),
      },
    );
    await waitFor(() => expect(onSnapshot).toHaveBeenCalledTimes(1));
    window.dispatchEvent(new Event('online'));
    await waitFor(() =>
      expect(onSnapshot.mock.calls.at(-1)?.[0].queue.revision).toBe(4),
    );
    expect(states).toContain('reconnecting');
    await cleanup();
  });

  it('maps channel errors to a calm reconnecting state', async () => {
    const fake = fakeClient([1, 2]);
    const states: string[] = [];
    const cleanup = await new SupabaseQueueAdapter(fake.client).subscribe(
      'test-queue',
      {
        onSnapshot: vi.fn(),
        onConnectionState: (state) => states.push(state),
        onError: vi.fn(),
      },
    );
    await waitFor(() => expect(states).toContain('connected'));
    fake.channel.status?.('CHANNEL_ERROR');
    expect(states.at(-1)).toBe('reconnecting');
    await cleanup();
  });

  it('unsubscribes and removes browser listeners during cleanup', async () => {
    const fake = fakeClient([1, 2]);
    const cleanup = await new SupabaseQueueAdapter(fake.client).subscribe(
      'test-queue',
      {
        onSnapshot: vi.fn(),
        onConnectionState: vi.fn(),
        onError: vi.fn(),
      },
    );
    await cleanup();
    expect(fake.removeChannel).toHaveBeenCalledWith(fake.channel);
  });
});
