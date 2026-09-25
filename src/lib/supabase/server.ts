import { createServerClient } from '@supabase/ssr';
import { createClient as createSupabaseJsClient, SupabaseClient, User } from '@supabase/supabase-js';
import { cookies } from 'next/headers';
import { Database } from '@/types/database';
import { getSupabaseConfig, isSupabaseConfigured, isSupabaseServerConfigured } from './config';

/**
 * Server-Side Supabase Client Utilities for Next.js App Router
 * 
 * Provides cookie-aware client instances for Server Components, Server Actions,
 * and Route Handlers using @supabase/ssr.
 * Strictly prevents client-side execution.
 */

/**
 * Creates an authenticated Supabase client for Server Components / Server Actions
 * that reads and writes session tokens via HTTP-only request cookies.
 */
export async function createSupabaseServerClient(): Promise<SupabaseClient<Database> | null> {
  if (typeof window !== 'undefined') {
    console.error('[Supabase Server] createSupabaseServerClient was invoked in a client environment.');
    return null;
  }

  if (!isSupabaseConfigured()) {
    return null;
  }

  const { url, anonKey } = getSupabaseConfig();
  if (!url || !anonKey) return null;

  const cookieStore = await cookies();

  return createServerClient<Database>(url, anonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          );
        } catch {
          // The `setAll` method was called from a Server Component.
          // This can be safely ignored if middleware is refreshing user sessions.
        }
      },
    },
  });
}

/**
 * Standard createClient alias for server contexts
 */
export async function createClient(): Promise<SupabaseClient<Database> | null> {
  return createSupabaseServerClient();
}

/**
 * Safely retrieves the currently authenticated user from server-side context
 * using validated JWT claims from Supabase Auth.
 */
export async function getAuthenticatedUser(): Promise<User | null> {
  const supabase = await createSupabaseServerClient();
  if (!supabase) return null;
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) return null;
  return user;
}

export type CandidateProfile = Database['public']['Tables']['profiles']['Row'];

/**
 * Safely retrieves the candidate profile for the currently authenticated user
 * using the authenticated cookie-based server client, strictly respecting RLS.
 */
export async function getAuthenticatedProfile(): Promise<CandidateProfile | null> {
  const supabase = await createSupabaseServerClient();
  if (!supabase) return null;

  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError || !user) return null;

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .maybeSingle();

  if (profileError || !profile) {
    return null;
  }

  return profile;
}

/**
 * Creates an admin Supabase client using SUPABASE_SERVICE_ROLE_KEY.
 * Must ONLY be used for authorized backend administrative tasks.
 * NEVER exposed to client components.
 */
export function getSupabaseAdminClient(): SupabaseClient<Database> | null {
  if (typeof window !== 'undefined') {
    console.error('[Supabase Server] getSupabaseAdminClient was invoked in a client environment.');
    return null;
  }

  if (!isSupabaseServerConfigured()) {
    return null;
  }

  const { url } = getSupabaseConfig();
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!url || !serviceKey) return null;

  return createSupabaseJsClient<Database>(url, serviceKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}

/**
 * Legacy helper for backwards compatibility.
 */
export async function getSupabaseServerClient(useServiceRole: boolean = false): Promise<SupabaseClient<Database> | null> {
  if (useServiceRole) {
    return getSupabaseAdminClient();
  }
  return createSupabaseServerClient();
}
