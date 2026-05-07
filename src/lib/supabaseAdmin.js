import { createClient } from '@supabase/supabase-js'

/**
 * Server-only Supabase client with the service role key (bypasses RLS).
 * Requires `SUPABASE_SERVICE_ROLE_KEY` and `SUPABASE_URL` or `VITE_SUPABASE_URL`.
 *
 * @returns {import('@supabase/supabase-js').SupabaseClient}
 */
export function createSupabaseAdmin() {
  const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || typeof url !== 'string') {
    throw new Error('Missing SUPABASE_URL (or VITE_SUPABASE_URL) for server Supabase client')
  }
  if (!serviceRoleKey || typeof serviceRoleKey !== 'string') {
    throw new Error('Missing SUPABASE_SERVICE_ROLE_KEY for server Supabase client')
  }
  return createClient(url, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
}
