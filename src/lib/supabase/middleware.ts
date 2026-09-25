import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';
import { Database } from '@/types/database';
import { getSupabaseConfig, isSupabaseConfigured } from './config';

/**
 * Middleware session updater for Next.js App Router
 * 
 * - Refreshes Auth tokens across requests via HTTP cookies.
 * - Enforces server-side route protection for /dashboard, /exam, /results, /settings.
 * - Redirects authenticated candidates away from /login and /signup.
 * - Public routes: /, /login, /signup, /practice remain accessible.
 */
export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  });

  if (!isSupabaseConfigured()) {
    return supabaseResponse;
  }

  const { url, anonKey } = getSupabaseConfig();
  if (!url || !anonKey) {
    return supabaseResponse;
  }

  const supabase = createServerClient<Database>(url, anonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        supabaseResponse = NextResponse.next({
          request,
        });
        cookiesToSet.forEach(({ name, value, options }) =>
          supabaseResponse.cookies.set(name, value, options)
        );
      },
    },
  });

  // IMPORTANT: DO NOT use getSession() in middleware or server code.
  // getUser() sends a request to the Supabase Auth server and validates the JWT.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const pathname = request.nextUrl.pathname;

  // Protected routes specified in Phase 7E-1
  const protectedRoutes = ['/dashboard', '/exam', '/results', '/settings'];
  const isProtected = protectedRoutes.some(
    (route) => pathname === route || pathname.startsWith(`${route}/`)
  );

  // If unauthenticated and accessing a protected route, redirect to /login
  if (isProtected && !user) {
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = '/login';
    const redirectTarget = `${pathname}${request.nextUrl.search}`;
    loginUrl.searchParams.set('redirectTo', redirectTarget);
    
    const redirectResponse = NextResponse.redirect(loginUrl);
    for (const cookie of supabaseResponse.cookies.getAll()) {
      redirectResponse.cookies.set(cookie.name, cookie.value, cookie);
    }
    return redirectResponse;
  }

  // If already authenticated and accessing login or signup, redirect to dashboard or safe redirectTo
  if (user && (pathname === '/login' || pathname === '/signup')) {
    const rawRedirect = request.nextUrl.searchParams.get('redirectTo') || '/dashboard';
    const safeRedirect = (rawRedirect.startsWith('/') && !rawRedirect.startsWith('//'))
      ? rawRedirect
      : '/dashboard';

    const destinationUrl = request.nextUrl.clone();
    destinationUrl.pathname = safeRedirect;
    destinationUrl.search = '';

    const redirectResponse = NextResponse.redirect(destinationUrl);
    for (const cookie of supabaseResponse.cookies.getAll()) {
      redirectResponse.cookies.set(cookie.name, cookie.value, cookie);
    }
    return redirectResponse;
  }

  return supabaseResponse;
}
