import { createBrowserClient } from '@supabase/ssr'

/**
 * Supabase browser client using @supabase/ssr.
 * This correctly stores the session in cookies (not localStorage),
 * making it readable by the server-side proxy and Server Components.
 *
 * Do NOT use @supabase/supabase-js createClient here — it uses
 * localStorage which the server cannot read.
 */
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}