import { createBrowserClient } from '@supabase/ssr';
import { SupabaseClient } from '@supabase/supabase-js';
import { Database } from '@/types/database';
import { getSupabaseConfig, isSupabaseConfigured } from './config';

/**
 * Browser-Safe Supabase Client Singleton using @supabase/ssr
 * 
 * Automatically synchronizes authentication session tokens via browser cookies,
 * ensuring seamless SSR compatibility with Next.js Server Components and Middleware.
 * 
 * Uses ONLY public environment variables:
 * - NEXT_PUBLIC_SUPABASE_URL
 * - NEXT_PUBLIC_SUPABASE_ANON_KEY
 * 
 * Never accesses or exposes SUPABASE_SERVICE_ROLE_KEY.
 */

let browserClient: SupabaseClient<Database> | null = null;

/**
 * Returns the browser Supabase client instance, or null if unconfigured / non-browser.
 */
export function getSupabaseBrowserClient(): SupabaseClient<Database> | null {
  if (typeof window === 'undefined') {
    return null;
  }

  if (browserClient) {
    return browserClient;
  }

  if (!isSupabaseConfigured()) {
    return null;
  }

  const { url, anonKey } = getSupabaseConfig();
  if (!url || !anonKey) {
    return null;
  }

  try {
    browserClient = createBrowserClient<Database>(url, anonKey);
    return browserClient;
  } catch (error) {
    console.warn('[Supabase Client] Failed to initialize browser client:', error);
    return null;
  }
}

/**
 * Standard alias for Next.js App Router client components
 */
export function createClient(): SupabaseClient<Database> | null {
  return getSupabaseBrowserClient();
}

/**
 * Browser client instance for standard imports in client components.
 * Returns null during SSR / prerender pass.
 */
export const supabase = typeof window !== 'undefined' ? getSupabaseBrowserClient() : null;

