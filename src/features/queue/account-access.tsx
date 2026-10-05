'use client';

import { useEffect, useState } from 'react';
import type { User } from '@supabase/supabase-js';
import { createSupabaseBrowserClient } from '@/lib/supabase/client';
import {
  accountRecoveryEnabled,
  sendAccountCode,
  verifyAccountCode,
  type AccountMode,
} from '@/lib/supabase/account';

export function AccountAccess() {
  const [user, setUser] = useState<User | null>(null);
  const [mode, setMode] = useState<AccountMode>('save');
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [cooldown, setCooldown] = useState(0);
  useEffect(() => {
    if (!accountRecoveryEnabled) return;
    const client = createSupabaseBrowserClient();
    const { data } = client.auth.onAuthStateChange((_event, session) =>
      setUser(session?.user ?? null),
    );
    return () => data.subscription.unsubscribe();
  }, []);
  useEffect(() => {
    if (!cooldown) return;
    const timer = setTimeout(() => setCooldown((value) => value - 1), 1000);
    return () => clearTimeout(timer);
  }, [cooldown]);
  if (!accountRecoveryEnabled) return null;
  const saved = user && !user.is_anonymous && user.email_confirmed_at;
  async function send() {
    setBusy(true);
    setError('');
    setNotice('');
    try {
      await sendAccountCode(email.trim(), mode);
      setSent(true);
      setCooldown(60);
      setNotice(
        'Check your inbox and spam folder for a verification code. Keep this page open.',
      );
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Please try again.');
    } finally {
      setBusy(false);
    }
  }
  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!sent) {
      await send();
      return;
    }
    setBusy(true);
    setError('');
    try {
      await verifyAccountCode(email.trim(), code.trim(), mode);
      // Reload all queue state under the verified identity; never keep a stale board.
      window.location.reload();
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Please try again.');
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="account-access" aria-labelledby="account-heading">
      <h2 id="account-heading">
        {saved ? 'Your access is saved' : 'Keep your access'}
      </h2>
      {saved ? (
        <div>
          <p>
            Signed in as <strong>{user.email}</strong>. Use this email to
            recover your queues on another device.
          </p>
          <button
            className="button button-secondary"
            disabled={busy}
            onClick={async () => {
              setBusy(true);
              setError('');
              const { error } =
                await createSupabaseBrowserClient().auth.signOut({
                  scope: 'local',
                });
              if (error) {
                setError(
                  'Could not sign out. Check your connection and try again.',
                );
                setBusy(false);
              } else window.location.reload();
            }}
          >
            Sign out of this browser
          </button>
          {error && <p role="alert">{error}</p>}
        </div>
      ) : (
        <>
          <p>
            Optional: verify your email to keep your queues if you change
            devices or clear this browser. No password needed.
          </p>
          <form onSubmit={submit}>
            <fieldset disabled={busy || sent}>
              <legend>What would you like to do?</legend>
              <label>
                <input
                  type="radio"
                  name="account-mode"
                  checked={mode === 'save'}
                  onChange={() => {
                    setMode('save');
                    setError('');
                  }}
                />{' '}
                Save this browser’s access
              </label>
              <label>
                <input
                  type="radio"
                  name="account-mode"
                  checked={mode === 'recover'}
                  onChange={() => {
                    setMode('recover');
                    setError('');
                  }}
                />{' '}
                Recover an existing account
              </label>
            </fieldset>
            <label htmlFor="account-email">Email address</label>
            <input
              className="text-input"
              id="account-email"
              type="email"
              autoComplete="email"
              required
              maxLength={254}
              value={email}
              disabled={busy || sent}
              onChange={(event) => setEmail(event.target.value)}
            />
            {sent && (
              <>
                <label htmlFor="account-code">Code from your email</label>
                <input
                  autoFocus
                  className="text-input"
                  id="account-code"
                  autoComplete="one-time-code"
                  inputMode="numeric"
                  pattern="[0-9]{6,10}"
                  minLength={6}
                  maxLength={10}
                  required
                  value={code}
                  disabled={busy}
                  onChange={(event) => setCode(event.target.value)}
                />
              </>
            )}
            <div className="utility-actions">
              <button className="button button-accent" disabled={busy}>
                {busy
                  ? 'Please wait…'
                  : sent
                    ? 'Verify and continue'
                    : 'Email me a code'}
              </button>
              {sent && (
                <>
                  <button
                    className="button button-secondary"
                    type="button"
                    disabled={busy || cooldown > 0}
                    onClick={() => void send()}
                  >
                    {cooldown ? `Resend in ${cooldown}s` : 'Resend code'}
                  </button>
                  <button
                    type="button"
                    className="button button-secondary"
                    disabled={busy}
                    onClick={() => {
                      setSent(false);
                      setCode('');
                      setError('');
                      setNotice('');
                    }}
                  >
                    Change email
                  </button>
                </>
              )}
            </div>
            {notice && <p role="status">{notice}</p>}
            {error && <p role="alert">{error}</p>}
          </form>
        </>
      )}
    </section>
  );
}
