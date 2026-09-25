/**
 * Supabase Configuration & Availability Helper
 * 
 * Provides safe, non-throwing utilities to check whether Supabase environment
 * variables are configured. Enables seamless fallback to client-side data
 * when running offline, in test environments, or prior to database provisioning.
 */

export interface SupabasePublicConfig {
  url: string | null;
  anonKey: string | null;
  isConfigured: boolean;
}

/**
 * Returns true if both the Supabase project URL and public Anon Key are set.
 * Safe to execute on both client and server without throwing errors.
 */
export function isSupabaseConfigured(): boolean {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  return (
    typeof url === 'string' &&
    url.trim().length > 0 &&
    typeof anonKey === 'string' &&
    anonKey.trim().length > 0
  );
}

/**
 * Returns the public configuration object.
 */
export function getSupabaseConfig(): SupabasePublicConfig {
  const isConfigured = isSupabaseConfigured();
  return {
    url: isConfigured ? (process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() || null) : null,
    anonKey: isConfigured ? (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim() || null) : null,
    isConfigured,
  };
}

/**
 * Checks whether the server-side Service Role Key is available.
 * Must ONLY be called in server environments (Node.js runtime / Route Handlers).
 */
export function isSupabaseServerConfigured(): boolean {
  if (typeof window !== 'undefined') {
    return false;
  }
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  return isSupabaseConfigured() && typeof serviceKey === 'string' && serviceKey.trim().length > 0;
}
