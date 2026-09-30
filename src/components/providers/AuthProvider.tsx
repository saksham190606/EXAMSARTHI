"use client";

import React, { createContext, useContext, useEffect, useState, useMemo, useCallback } from 'react';
import { User, Session, AuthError } from '@supabase/supabase-js';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import { Database } from '@/types/database';

export type CandidateProfile = Database['public']['Tables']['profiles']['Row'];

interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: CandidateProfile | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: AuthError | null; data: { user: User | null; session: Session | null } | null }>;
  signUp: (email: string, password: string, fullName?: string) => Promise<{ error: AuthError | null; data: { user: User | null; session: Session | null } | null }>;
  signOut: () => Promise<{ error: AuthError | null }>;
  refreshUser: () => Promise<void>;
  refreshProfile: () => Promise<CandidateProfile | null>;
  updateProfile: (updates: { full_name?: string | null }) => Promise<{ error: Error | null; data: CandidateProfile | null }>;
}

export function isDemoCredentials(loginId: string, pass: string): boolean {
  if (!loginId || !pass) return false;
  const cleanId = loginId.toLowerCase().trim().replace(/[@\s._-]/g, '');
  const cleanPass = pass.toLowerCase().trim().replace(/\s+/g, '');

  const idMatches =
    cleanId.includes('priyansh') ||
    cleanId === 'demo' ||
    cleanId === 'candidate' ||
    cleanId === 'student';

  const passMatches =
    cleanPass === '12345' ||
    cleanPass === '2345' ||
    cleanPass === 'onetwothreefourfive' ||
    cleanPass === '123456';

  return idMatches && passMatches;
}

export function createDemoUser(): User {
  return {
    id: 'demo-priyansh-01',
    app_metadata: { provider: 'demo' },
    user_metadata: { full_name: 'Priyansh Gupta' },
    aud: 'authenticated',
    confirmation_sent_at: '',
    confirmed_at: new Date().toISOString(),
    created_at: new Date().toISOString(),
    email: 'priyansh01@examsarthi.in',
    phone: '',
    role: 'authenticated',
    updated_at: new Date().toISOString(),
  } as unknown as User;
}

export function createDemoSession(user: User): Session {
  return {
    access_token: 'demo-access-token-priyansh',
    token_type: 'bearer',
    expires_in: 3600 * 24 * 30,
    expires_at: Math.floor(Date.now() / 1000) + 3600 * 24 * 30,
    refresh_token: 'demo-refresh-token',
    user,
  } as unknown as Session;
}

export function createDemoProfile(userId: string): CandidateProfile {
  return {
    id: userId,
    full_name: 'Priyansh Gupta',
    avatar_url: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<CandidateProfile | null>(null);
  const [loading, setLoading] = useState(true);

  const supabase = useMemo(() => getSupabaseBrowserClient(), []);

  /**
   * Idempotent candidate profile synchronizer.
   * Loads existing row or safely provisions initial profile row.
   */
  const syncProfile = useCallback(async (
    userId: string,
    initialName?: string | null
  ): Promise<CandidateProfile | null> => {
    if (!supabase) return null;

    try {
      // 1. Query existing profile
      const { data: existing, error: fetchErr } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle();

      if (existing) {
        setProfile(existing);
        return existing;
      }

      // 2. If row does not exist, provision initial row idempotently
      if (!fetchErr && !existing) {
        const { data: created, error: createErr } = await supabase
          .from('profiles')
          .upsert({
            id: userId,
            full_name: initialName ?? null,
            updated_at: new Date().toISOString(),
          }, { onConflict: 'id' })
          .select()
          .single();

        if (!createErr && created) {
          setProfile(created);
          return created;
        }
      }
    } catch (err) {
      console.warn('[AuthProvider] Profile synchronization warning:', err);
    }

    // 3. Fallback: in-memory representation so UI remains functional
    const fallbackProfile: CandidateProfile = {
      id: userId,
      full_name: initialName ?? null,
      avatar_url: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    setProfile(fallbackProfile);
    return fallbackProfile;
  }, [supabase]);

  useEffect(() => {
    // Check if demo user is stored in localStorage or cookie
    if (typeof window !== 'undefined') {
      try {
        const stored = localStorage.getItem('examsarthi_demo_auth');
        const hasDemoCookie = document.cookie.includes('examsarthi_demo_auth=1');
        if (stored || hasDemoCookie) {
          const parsed = stored ? JSON.parse(stored) : null;
          const demoUser = parsed?.user || createDemoUser();
          const demoSession = parsed?.session || createDemoSession(demoUser);
          const demoProfile = parsed?.profile || createDemoProfile(demoUser.id);
          setUser(demoUser);
          setSession(demoSession);
          setProfile(demoProfile);
          setLoading(false);
          document.cookie = 'examsarthi_demo_auth=1; path=/; max-age=2592000; SameSite=Lax';
          return;
        }
      } catch (_) {}
    }

    if (!supabase) {
      setLoading(false);
      return;
    }

    let isMounted = true;

    // Fetch active session on mount
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!isMounted) return;
      setSession(session);
      const currentUser = session?.user ?? null;
      setUser(currentUser);
      if (currentUser) {
        await syncProfile(
          currentUser.id,
          (currentUser.user_metadata?.full_name as string | undefined) ?? null
        );
      } else {
        setProfile(null);
      }
      setLoading(false);
    }).catch((err) => {
      console.warn('[AuthProvider] Error fetching session:', err);
      if (isMounted) setLoading(false);
    });

    // Listen to real-time auth state transitions
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, currentSession) => {
      if (!isMounted) return;
      setSession(currentSession);
      const currentUser = currentSession?.user ?? null;
      setUser(currentUser);
      if (currentUser) {
        await syncProfile(
          currentUser.id,
          (currentUser.user_metadata?.full_name as string | undefined) ?? null
        );
      } else {
        setProfile(null);
      }
      setLoading(false);
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, [supabase, syncProfile]);

  const signIn = useCallback(async (email: string, password: string) => {
    // Demo credentials bypass (priyansh01 / 12345)
    if (isDemoCredentials(email, password)) {
      const demoUser = createDemoUser();
      const demoSession = createDemoSession(demoUser);
      const demoProfile = createDemoProfile(demoUser.id);

      setUser(demoUser);
      setSession(demoSession);
      setProfile(demoProfile);
      setLoading(false);

      if (typeof window !== 'undefined') {
        try {
          localStorage.setItem('examsarthi_demo_auth', JSON.stringify({
            user: demoUser,
            session: demoSession,
            profile: demoProfile,
          }));
          document.cookie = 'examsarthi_demo_auth=1; path=/; max-age=2592000; SameSite=Lax';
          await fetch('/api/auth/demo-session', { method: 'POST' }).catch(() => {});
        } catch (_) {}
      }

      return { data: { user: demoUser, session: demoSession }, error: null };
    }

    if (!supabase) {
      return { error: new AuthError('Supabase is not configured.') as any, data: null };
    }
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (!error && data.session && data.user) {
      setSession(data.session);
      setUser(data.user);
      await syncProfile(
        data.user.id,
        (data.user.user_metadata?.full_name as string | undefined) ?? null
      );
    }
    return { data, error };
  }, [supabase, syncProfile]);

  const signUp = useCallback(async (email: string, password: string, fullName?: string) => {
    if (!supabase) {
      return { error: new AuthError('Supabase is not configured.') as any, data: null };
    }
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: fullName ? { full_name: fullName } : undefined,
      },
    });
    if (!error && data.session && data.user) {
      setSession(data.session);
      setUser(data.user);
      await syncProfile(
        data.user.id,
        fullName || (data.user.user_metadata?.full_name as string | undefined) || null
      );
    }
    return { data, error };
  }, [supabase, syncProfile]);

  const signOut = useCallback(async () => {
    // Clear user and profile state immediately to prevent stale identity display
    setProfile(null);
    setSession(null);
    setUser(null);

    if (typeof window !== 'undefined') {
      try {
        localStorage.removeItem('examsarthi_demo_auth');
        document.cookie = 'examsarthi_demo_auth=; path=/; max-age=0; SameSite=Lax';
        await fetch('/api/auth/demo-session', { method: 'DELETE' }).catch(() => {});
      } catch (_) {}
    }

    if (!supabase) {
      return { error: null };
    }
    try {
      const { error } = await supabase.auth.signOut();
      return { error };
    } catch (err: any) {
      return { error: err };
    }
  }, [supabase]);

  const refreshUser = useCallback(async () => {
    if (!supabase) return;
    const { data: { user } } = await supabase.auth.getUser();
    setUser(user);
    if (user) {
      await syncProfile(
        user.id,
        (user.user_metadata?.full_name as string | undefined) ?? null
      );
    } else {
      setProfile(null);
    }
  }, [supabase, syncProfile]);

  const refreshProfile = useCallback(async (): Promise<CandidateProfile | null> => {
    if (!supabase || !user) return null;
    return await syncProfile(
      user.id,
      (user.user_metadata?.full_name as string | undefined) ?? null
    );
  }, [supabase, user, syncProfile]);

  const updateProfile = useCallback(async (updates: { full_name?: string | null }) => {
    if (!supabase || !user) {
      return { error: new Error('Candidate is not authenticated.'), data: null };
    }

    try {
      const cleanName = updates.full_name !== undefined
        ? (updates.full_name?.trim() || null)
        : profile?.full_name ?? null;

      const { data, error } = await supabase
        .from('profiles')
        .update({
          full_name: cleanName,
          updated_at: new Date().toISOString(),
        })
        .eq('id', user.id)
        .select()
        .single();

      if (error) {
        return { error: new Error(error.message), data: null };
      }

      if (data) {
        setProfile(data);
        // Keep auth metadata in sync non-blockingly
        supabase.auth.updateUser({ data: { full_name: cleanName } }).catch(() => {});
        return { error: null, data };
      }

      return { error: new Error('Profile update returned no data.'), data: null };
    } catch (err: any) {
      return { error: err instanceof Error ? err : new Error(String(err)), data: null };
    }
  }, [supabase, user, profile]);

  const value = useMemo(() => ({
    user,
    session,
    profile,
    loading,
    signIn,
    signUp,
    signOut,
    refreshUser,
    refreshProfile,
    updateProfile,
  }), [user, session, profile, loading, signIn, signUp, signOut, refreshUser, refreshProfile, updateProfile]);

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
