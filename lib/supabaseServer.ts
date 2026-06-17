import { createClient as createSupabaseClient } from '@supabase/supabase-js';

/**
 * Supabase client instance that can be used in server components.
 * It uses the same environment variables as the client instance.
 */
export const supabaseServer = createSupabaseClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);
