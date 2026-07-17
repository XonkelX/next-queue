import type { SupabaseClient, User } from '@supabase/supabase-js';
import type { Database } from './database.types';
import { createSupabaseBrowserClient } from './client';

export class AnonymousSessionError extends Error {
  readonly code = 'AUTH_INITIALIZATION_FAILED';

  constructor(message = 'Your private browser session could not be prepared.') {
    super(message);
    this.name = 'AnonymousSessionError';
  }
}

let pendingSession: Promise<User> | undefined;

export function ensureAnonymousSession(
  client: SupabaseClient<Database> = createSupabaseBrowserClient(),
): Promise<User> {
  if (pendingSession) return pendingSession;

  pendingSession = (async () => {
    const { data: sessionData, error: sessionError } =
      await client.auth.getSession();
    if (sessionError) throw new AnonymousSessionError();
    if (sessionData.session?.user) return sessionData.session.user;

    const { data, error } = await client.auth.signInAnonymously();
    if (error || !data.user) throw new AnonymousSessionError();
    return data.user;
  })().catch((error: unknown) => {
    pendingSession = undefined;
    if (error instanceof AnonymousSessionError) throw error;
    throw new AnonymousSessionError();
  });

  return pendingSession;
}

export function resetAnonymousSessionForTests() {
  pendingSession = undefined;
}
