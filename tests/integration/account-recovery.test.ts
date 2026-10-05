import { createClient } from '@supabase/supabase-js';
import { expect, it } from 'vitest';

// A real Auth + local SMTP round trip. Never send test emails to production.
const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!;
const local = ['localhost', '127.0.0.1'].includes(new URL(url).hostname);
const client = () =>
  createClient(url, key, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  });
async function mailboxCode(email: string, exclude = '') {
  for (let attempt = 0; attempt < 30; attempt++) {
    const response = await fetch('http://127.0.0.1:54324/api/v1/messages');
    if (!response.ok) throw new Error('Local test mailbox is unavailable');
    const inbox = (await response.json()) as {
      messages: { ID: string; To: { Address: string }[] }[];
    };
    const message = inbox.messages.find(
      (item) =>
        item.ID !== exclude &&
        item.To.some((recipient) => recipient.Address === email),
    );
    if (message) {
      const body = (await (
        await fetch(`http://127.0.0.1:54324/api/v1/message/${message.ID}`)
      ).json()) as { Text: string; HTML: string };
      const code = (body.Text || body.HTML).match(/\b\d{6,10}\b/)?.[0];
      if (code) return { code, id: message.ID };
    }
    await new Promise((resolve) => setTimeout(resolve, 200));
  }
  throw new Error('No verification code arrived in the local mailbox');
}
it.skipIf(!local)(
  'preserves anonymous queue ownership through email verification and recovery on another device',
  async () => {
    const original = client();
    const anonymous = await original.auth.signInAnonymously();
    expect(anonymous.error).toBeNull();
    const originalId = anonymous.data.user!.id;
    const created = await original.rpc('create_queue', {
      queue_name: 'Account recovery test',
      queue_prefix: 'R',
      request_id: crypto.randomUUID(),
    });
    expect(created.error).toBeNull();
    expect(created.data.ok).toBe(true);
    const email = `recovery-${crypto.randomUUID()}@example.test`;
    const linked = await original.auth.updateUser({ email });
    expect(linked.error).toBeNull();
    const verification = await mailboxCode(email);
    const saved = await original.auth.verifyOtp({
      email,
      token: verification.code,
      type: 'email_change',
    });
    expect(saved.error).toBeNull();
    expect(saved.data.user?.id).toBe(originalId);
    expect(saved.data.user?.is_anonymous).toBe(false);
    const recovered = client();
    await new Promise((resolve) => setTimeout(resolve, 1100));
    expect(
      (
        await recovered.auth.signInWithOtp({
          email,
          options: { shouldCreateUser: false },
        })
      ).error,
    ).toBeNull();
    const recovery = await mailboxCode(email, verification.id);
    const signedIn = await recovered.auth.verifyOtp({
      email,
      token: recovery.code,
      type: 'email',
    });
    expect(signedIn.error).toBeNull();
    expect(signedIn.data.user?.id).toBe(originalId);
    const queues = await recovered.rpc('list_staff_queues');
    expect(queues.error).toBeNull();
    expect(queues.data).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: created.data.queue.id, is_owner: true }),
      ]),
    );
  },
);
