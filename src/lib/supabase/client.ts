import { createBrowserClient } from '@supabase/ssr';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from './database.types';

let browserClient: SupabaseClient<Database> | undefined;

function publicConfiguration() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

  if (!url || !publishableKey) {
    throw new Error(
      'Supabase is not configured. Copy .env.example to .env.local and set the public project URL and publishable key.',
    );
  }

  return { url, publishableKey };
}

export function createSupabaseBrowserClient(): SupabaseClient<Database> {
  if (browserClient) return browserClient;
  const { url, publishableKey } = publicConfiguration();
  browserClient = createBrowserClient<Database>(url, publishableKey);
  return browserClient;
}
