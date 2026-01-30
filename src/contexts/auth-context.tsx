'use client';

import { createContext, useEffect, useState, useRef, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import type { User as SupabaseUser, Session } from '@supabase/supabase-js';
import { withRetry, withRetryOrNull } from '@/lib/utils/retry';

export interface UserProfile {
  id: string;
  email: string;
  role: string;
  profile: {
    first_name: string;
    last_name: string;
    title?: string;
    specialization?: string;
  };
  organization_id: string;
  organization?: {
    id: string;
    name: string;
    slug: string;
  };
}

interface AuthState {
  user: SupabaseUser | null;
  profile: UserProfile | null;
  session: Session | null;
  loading: boolean;
  error: string | null;
}

export interface AuthContextValue extends AuthState {
  signIn: (email: string, password: string) => Promise<{ data?: unknown; error?: unknown }>;
  signUp: (email: string, password: string, metadata?: { firstName?: string; lastName?: string }) => Promise<{ data?: unknown; error?: unknown }>;
  signOut: () => Promise<{ error: unknown }>;
  isAuthenticated: boolean;
}

export const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AuthState>({
    user: null,
    profile: null,
    session: null,
    loading: true,
    error: null,
  });
  const router = useRouter();
  const routerRef = useRef(router);
  routerRef.current = router;

  useEffect(() => {
    console.log('[Auth] Initializing auth subscription...');
    const supabase = createClient();

    // fetchProfile now THROWS on error (for retry logic to work)
    async function fetchProfile(userId: string): Promise<UserProfile> {
      console.log('[Auth] Starting profile fetch for user:', userId);

      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('id, email, role, profile, organization_id')
        .eq('id', userId)
        .single();

      console.log('[Auth] User query result:', {
        hasData: !!userData,
        error: userError ? { message: userError.message, code: userError.code, hint: userError.hint } : null
      });

      if (userError) {
        throw new Error(`User fetch failed: ${userError.message} (code: ${userError.code}, hint: ${userError.hint || 'none'})`);
      }

      if (!userData) {
        throw new Error('No user data returned from query');
      }

      let organization = null;
      if (userData.organization_id) {
        console.log('[Auth] Starting organization fetch for org_id:', userData.organization_id);

        const { data: orgData, error: orgError } = await supabase
          .from('organizations')
          .select('id, name, slug')
          .eq('id', userData.organization_id)
          .single();

        console.log('[Auth] Organization query result:', {
          hasData: !!orgData,
          error: orgError ? { message: orgError.message, code: orgError.code } : null
        });

        if (orgError) {
          // Organization fetch failure is non-fatal, just log it
          console.warn('[Auth] Organization fetch failed (non-fatal):', orgError.message);
        } else {
          organization = orgData;
        }
      }

      const profile: UserProfile = {
        id: userData.id,
        email: userData.email,
        role: userData.role,
        profile: userData.profile as UserProfile['profile'],
        organization_id: userData.organization_id,
        organization: organization as UserProfile['organization'],
      };

      console.log('[Auth] Profile fetch complete:', {
        id: profile.id,
        email: profile.email,
        role: profile.role,
        hasOrg: !!profile.organization
      });

      return profile;
    }

    // Single subscription for the entire app.
    // Fires INITIAL_SESSION immediately, then handles sign in/out/token refresh.
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('[Auth] onAuthStateChange fired:', { event, hasSession: !!session, userId: session?.user?.id });

        if (session?.user) {
          // Set user/session but KEEP loading:true until profile is ready
          console.log('[Auth] Session found, setting user (loading still true)');
          setState(prev => ({
            ...prev,
            user: session.user,
            session,
            error: null,
            // loading stays TRUE — don't release until profile ready
          }));

          // Fetch profile with retry and timeout protection
          const PROFILE_TIMEOUT_MS = 15000; // 15 seconds max

          const profilePromise = withRetryOrNull(
            () => fetchProfile(session.user.id),
            {
              maxAttempts: 3,
              baseDelayMs: 200,
              onRetry: (attempt, error) => {
                console.warn(`[Auth] Profile fetch retry ${attempt}:`, error.message);
              },
            }
          );

          const timeoutPromise = new Promise<null>((resolve) => {
            setTimeout(() => {
              console.error('[Auth] Profile fetch timed out after 15s');
              resolve(null);
            }, PROFILE_TIMEOUT_MS);
          });

          const profile = await Promise.race([profilePromise, timeoutPromise]);

          // NOW set loading:false — profile fetch complete (success or failure)
          console.log('[Auth] Setting final state:', {
            loading: false,
            hasProfile: !!profile,
            error: profile ? null : 'Failed to load user profile'
          });

          setState(prev => ({
            ...prev,
            profile,
            loading: false,
            error: profile ? null : 'Failed to load user profile',
          }));
        } else {
          console.log('[Auth] No session, clearing state');
          setState({
            user: null,
            profile: null,
            session: null,
            loading: false,
            error: null,
          });
        }

        if (event === 'SIGNED_IN' || event === 'SIGNED_OUT') {
          console.log('[Auth] Refreshing router for event:', event);
          routerRef.current.refresh();
        }
      }
    );

    return () => {
      console.log('[Auth] Cleaning up subscription');
      subscription.unsubscribe();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const signIn = useCallback(async (email: string, password: string) => {
    const supabase = createClient();
    setState(prev => ({ ...prev, loading: true }));

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      setState(prev => ({ ...prev, loading: false }));
      return { error };
    }

    return { data };
  }, []);

  const signUp = useCallback(async (
    email: string,
    password: string,
    metadata?: { firstName?: string; lastName?: string }
  ) => {
    const supabase = createClient();
    setState(prev => ({ ...prev, loading: true }));

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: metadata,
      },
    });

    if (error) {
      setState(prev => ({ ...prev, loading: false }));
      return { error };
    }

    return { data };
  }, []);

  const signOut = useCallback(async () => {
    const supabase = createClient();
    setState(prev => ({ ...prev, loading: true }));

    try {
      const { error } = await supabase.auth.signOut();

      if (error) {
        console.error('Sign out failed:', error.message);
        setState(prev => ({ ...prev, loading: false, error: 'Failed to sign out' }));
        return { error };
      }

      setState({
        user: null,
        profile: null,
        session: null,
        loading: false,
        error: null,
      });

      routerRef.current.push('/login');
      return { error: null };
    } catch (error) {
      console.error('Sign out exception:', error);
      setState({
        user: null,
        profile: null,
        session: null,
        loading: false,
        error: 'Sign out failed unexpectedly',
      });
      routerRef.current.push('/login');
      return { error: error as Error };
    }
  }, []);

  const value: AuthContextValue = {
    ...state,
    signIn,
    signUp,
    signOut,
    isAuthenticated: !!state.user,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}
