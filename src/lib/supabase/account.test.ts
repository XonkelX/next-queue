import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from './database.types';

const mocks = vi.hoisted(() => ({ session: vi.fn(), captcha: vi.fn() }));
vi.mock('./session', () => ({ ensureAnonymousSession: mocks.session }));
vi.mock('./captcha', () => ({ requestCaptchaToken: mocks.captcha }));
beforeEach(() => {
  vi.resetModules();
  vi.stubEnv('NEXT_PUBLIC_ACCOUNT_RECOVERY_ENABLED', 'true');
  mocks.session.mockResolvedValue({ id: 'original', is_anonymous: true });
  mocks.captcha.mockResolvedValue('fresh-token');
});
function fakeClient(hasAccess = false) {
  const auth = {
    updateUser: vi.fn().mockResolvedValue({ error: null }),
    signInWithOtp: vi.fn().mockResolvedValue({ error: null }),
    verifyOtp: vi.fn().mockResolvedValue({
      data: {
        user: {
          id: 'original',
          is_anonymous: false,
          email_confirmed_at: '2026-10-05',
        },
      },
      error: null,
    }),
  };
  const limit = vi
    .fn()
    .mockResolvedValue({ data: hasAccess ? [{}] : [], error: null });
  return {
    auth,
    limit,
    typed: {
      auth,
      from: () => ({ select: () => ({ eq: () => ({ limit }) }) }),
    } as unknown as SupabaseClient<Database>,
  };
}
describe('optional account recovery', () => {
  it('links email to the current identity instead of creating another account', async () => {
    const { sendAccountCode, verifyAccountCode } = await import('./account');
    const fake = fakeClient(true);
    await sendAccountCode('owner@example.com', 'save', fake.typed);
    await verifyAccountCode('owner@example.com', '123456', 'save', fake.typed);
    expect(fake.auth.updateUser).toHaveBeenCalledWith({
      email: 'owner@example.com',
    });
    expect(fake.auth.signInWithOtp).not.toHaveBeenCalled();
    expect(fake.auth.verifyOtp).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'email_change',
        options: { captchaToken: 'fresh-token' },
      }),
    );
  });
  it('blocks recovery before replacing an identity with existing access', async () => {
    const { sendAccountCode, verifyAccountCode } = await import('./account');
    const fake = fakeClient(true);
    await expect(
      sendAccountCode('owner@example.com', 'recover', fake.typed),
    ).rejects.toThrow('already has queue access');
    await expect(
      verifyAccountCode('owner@example.com', '123456', 'recover', fake.typed),
    ).rejects.toThrow('already has queue access');
    expect(fake.auth.signInWithOtp).not.toHaveBeenCalled();
    expect(fake.auth.verifyOtp).not.toHaveBeenCalled();
  });
  it('recovers only existing accounts and supplies bot verification', async () => {
    const { sendAccountCode } = await import('./account');
    const fake = fakeClient();
    await sendAccountCode('owner@example.com', 'recover', fake.typed);
    expect(fake.auth.signInWithOtp).toHaveBeenCalledWith({
      email: 'owner@example.com',
      options: { shouldCreateUser: false, captchaToken: 'fresh-token' },
    });
  });
  it('does not report success for expired codes or unverified users', async () => {
    const { verifyAccountCode } = await import('./account');
    const fake = fakeClient();
    fake.auth.verifyOtp.mockResolvedValue({
      data: { user: null },
      error: { message: 'expired' },
    });
    await expect(
      verifyAccountCode('owner@example.com', '123456', 'save', fake.typed),
    ).rejects.toThrow('could not be verified');
  });
  it('fails closed when current access cannot be checked', async () => {
    const { sendAccountCode } = await import('./account');
    const fake = fakeClient();
    fake.limit.mockResolvedValue({ data: null, error: { message: 'offline' } });
    await expect(
      sendAccountCode('owner@example.com', 'recover', fake.typed),
    ).rejects.toThrow('Could not check');
    expect(fake.auth.signInWithOtp).not.toHaveBeenCalled();
  });
  it('keeps email actions unavailable until the service is configured', async () => {
    vi.stubEnv('NEXT_PUBLIC_ACCOUNT_RECOVERY_ENABLED', 'false');
    const { sendAccountCode } = await import('./account');
    const fake = fakeClient();
    await expect(
      sendAccountCode('owner@example.com', 'save', fake.typed),
    ).rejects.toThrow('not available');
    expect(fake.auth.updateUser).not.toHaveBeenCalled();
  });
});
