import { createSupabaseBrowserClient } from './client';
import { ensureAnonymousSession } from './session';
import { requestCaptchaToken } from './captcha';

export type AccountMode = 'save' | 'recover';
export const accountRecoveryEnabled =
  process.env.NEXT_PUBLIC_ACCOUNT_RECOVERY_ENABLED === 'true';

export async function assertSafeAccountSwitch(
  client = createSupabaseBrowserClient(),
) {
  const user = await ensureAnonymousSession(client);
  if (!user.is_anonymous) throw new Error('You are already signed in.');
  const [staff, tickets] = await Promise.all([
    client
      .from('queue_staff_memberships')
      .select('queue_id')
      .eq('user_id', user.id)
      .limit(1),
    client
      .from('queue_entry_private')
      .select('entry_id')
      .eq('customer_user_id', user.id)
      .limit(1),
  ]);
  if (staff.error || tickets.error)
    throw new Error('Could not check your current access. Please try again.');
  if (staff.data.length || tickets.data.length) {
    throw new Error(
      'This browser already has queue access. Save it with a new email, or recover your existing account in another browser to keep both identities safe.',
    );
  }
}

export async function sendAccountCode(
  email: string,
  mode: AccountMode,
  client = createSupabaseBrowserClient(),
) {
  if (!accountRecoveryEnabled)
    throw new Error(
      'Email recovery is not available yet. Keep your staff code safe.',
    );
  if (mode === 'save') {
    const user = await ensureAnonymousSession(client);
    if (!user.is_anonymous)
      throw new Error('Your access is already saved to an account.');
    const { error } = await client.auth.updateUser({ email });
    if (error)
      throw new Error(
        'Could not send a code. If this email already has an account, use Recover access in another browser. Otherwise wait a minute and try again.',
      );
  } else {
    await assertSafeAccountSwitch(client);
    const captchaToken = await requestCaptchaToken();
    const { error } = await client.auth.signInWithOtp({
      email,
      options: {
        shouldCreateUser: false,
        ...(captchaToken ? { captchaToken } : {}),
      },
    });
    if (error)
      throw new Error(
        'Could not send a code. Check your email address, wait a minute and try again.',
      );
  }
}

export async function verifyAccountCode(
  email: string,
  token: string,
  mode: AccountMode,
  client = createSupabaseBrowserClient(),
) {
  if (!accountRecoveryEnabled)
    throw new Error('Email recovery is not available yet.');
  if (mode === 'recover') await assertSafeAccountSwitch(client);
  const before = await ensureAnonymousSession(client);
  const captchaToken = await requestCaptchaToken();
  const { data, error } = await client.auth.verifyOtp({
    email,
    token,
    type: mode === 'save' ? 'email_change' : 'email',
    options: captchaToken ? { captchaToken } : {},
  });
  if (
    error ||
    !data.user ||
    data.user.is_anonymous ||
    !data.user.email_confirmed_at
  ) {
    throw new Error(
      'That code could not be verified. Check the code or request a new one.',
    );
  }
  if (mode === 'save' && data.user.id !== before.id)
    throw new Error(
      'Account identity changed unexpectedly. Please reload before continuing.',
    );
  return data.user;
}
