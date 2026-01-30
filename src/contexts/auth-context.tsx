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

  // Refs to prevent race conditions
  const fetchInProgressRef = useRef<string | null>(null);
  const lastProcessedUserIdRef = useRef<string | null>(null);

  useEffect(() => {
    console.log('[Auth] Initializing auth subscription...');
    const supabase = createClient();
    let isMounted = true;

    // Simple profile fetch without complex timeout logic
    async function fetchProfile(userId: string): Promise<UserProfile> {
      console.log('[Auth] Starting profile fetch for user:', userId);
      const startTime = Date.now();

      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('id, email, role, profile, organization_id')
        .eq('id', userId)
        .single();

      console.log('[Auth] Users query completed in', Date.now() - startTime, 'ms');

      if (userError) {
        console.error('[Auth] User query error:', userError);
        throw new Error(`User fetch failed: ${userError.message}`);
      }

      if (!userData) {
        throw new Error('No user data returned from query');
      }

      let organization = null;
      if (userData.organization_id) {
        console.log('[Auth] Fetching organization:', userData.organization_id);
        const { data: orgData, error: orgError } = await supabase
          .from('organizations')
          .select('id, name, slug')
          .eq('id', userData.organization_id)
          .single();

        if (orgError) {
          console.warn('[Auth] Organization fetch failed (non-fatal):', orgError.message);
        } else {
          organization = orgData;
        }
      }

      return {
        id: userData.id,
        email: userData.email,
        role: userData.role,
        profile: userData.profile as UserProfile['profile'],
        organization_id: userData.organization_id,
        organization: organization as UserProfile['organization'],
      };
    }

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('[Auth] onAuthStateChange:', { event, userId: session?.user?.id });

        // Ignore if component unmounted
        if (!isMounted) {
          console.log('[Auth] Component unmounted, ignoring event');
          return;
        }

        if (session?.user) {
          const userId = session.user.id;

          // Skip if we already have profile for this user
          if (lastProcessedUserIdRef.current === userId && state.profile?.id === userId) {
            console.log('[Auth] Already have profile for this user, skipping');
            return;
          }

          // Skip if fetch already in progress for this user
          if (fetchInProgressRef.current === userId) {
            console.log('[Auth] Fetch already in progress for this user, skipping');
            return;
          }

          // Mark fetch as in progress
          fetchInProgressRef.current = userId;

          // Set user immediately
          setState(prev => ({
            ...prev,
            user: session.user,
            session,
            error: null,
          }));

          try {
            console.log('[Auth] Starting profile fetch...');
            const profile = await fetchProfile(userId);

            // Only update if still mounted and this is still the current fetch
            if (isMounted && fetchInProgressRef.current === userId) {
              console.log('[Auth] Profile fetch successful');
              lastProcessedUserIdRef.current = userId;
              setState(prev => ({
                ...prev,
                profile,
                loading: false,
                error: null,
              }));
            }
          } catch (error) {
            console.error('[Auth] Profile fetch failed:', error);
            if (isMounted && fetchInProgressRef.current === userId) {
              setState(prev => ({
                ...prev,
                profile: null,
                loading: false,
                error: 'Failed to load user profile',
              }));
            }
          } finally {
            if (fetchInProgressRef.current === userId) {
              fetchInProgressRef.current = null;
            }
          }
        } else {
          console.log('[Auth] No session, clearing state');
          lastProcessedUserIdRef.current = null;
          fetchInProgressRef.current = null;
          setState({
            user: null,
            profile: null,
            session: null,
            loading: false,
            error: null,
          });
        }

        if (event === 'SIGNED_IN' || event === 'SIGNED_OUT') {
          routerRef.current.refresh();
        }
      }
    );

    return () => {
      console.log('[Auth] Cleaning up subscription');
      isMounted = false;
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
