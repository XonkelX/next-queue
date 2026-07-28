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

  const initialization = (async () => {
    const { data: userData, error: userError } = await client.auth.getUser();
    if (!userError && userData.user) return userData.user;

    const { data, error } = await client.auth.signInAnonymously();
    if (error || !data.user) throw new AnonymousSessionError();
    return data.user;
  })().catch((error: unknown) => {
    if (error instanceof AnonymousSessionError) throw error;
    throw new AnonymousSessionError();
  });

  pendingSession = initialization;
  void initialization.then(clearPendingSession, clearPendingSession);
  return initialization;
}

function clearPendingSession() {
  pendingSession = undefined;
}

export function resetAnonymousSessionForTests() {
  pendingSession = undefined;
}
