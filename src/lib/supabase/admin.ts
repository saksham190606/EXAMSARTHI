import { createClient as createSupabaseClient } from '@supabase/supabase-js'

// Note: This client uses the service role key, which bypasses RLS.
// It should ONLY be used in secure server environments (Server Actions, Route Handlers).
export const createAdminClient = () => {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY! || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    }
  )
}
