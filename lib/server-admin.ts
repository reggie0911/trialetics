import { createClient } from '@supabase/supabase-js';

/**
 * Server-side Supabase admin client for privileged operations (e.g. inviteUserByEmail, generateLink).
 * Uses SUPABASE_SERVICE_ROLE_KEY. Only use in server actions or API routes; never expose to client.
 */
export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceRoleKey) {
    throw new Error('NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set');
  }

  return createClient(url, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}
