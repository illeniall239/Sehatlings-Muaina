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
    const supabase = createClient();

    async function fetchProfile(userId: string): Promise<UserProfile | null> {
      try {
        const { data: userData, error: userError } = await supabase
          .from('users')
          .select('id, email, role, profile, organization_id')
          .eq('id', userId)
          .single();

        if (userError || !userData) {
          console.error('Error fetching user profile:', {
            message: userError?.message,
            code: userError?.code,
            details: userError?.details,
            hint: userError?.hint,
          });
          return null;
        }

        let organization = null;
        if (userData.organization_id) {
          // Retry organization fetch with exponential backoff
          organization = await withRetryOrNull(
            async () => {
              const { data, error } = await supabase
                .from('organizations')
                .select('id, name, slug')
                .eq('id', userData.organization_id)
                .single();
              if (error) throw error;
              return data;
            },
            {
              maxAttempts: 3,
              baseDelayMs: 100,
              onRetry: (attempt, error) => {
                console.warn(`Organization fetch retry ${attempt}:`, error.message);
              },
            }
          );
        }

        return {
          id: userData.id,
          email: userData.email,
          role: userData.role,
          profile: userData.profile as UserProfile['profile'],
          organization_id: userData.organization_id,
          organization: organization as UserProfile['organization'],
        };
      } catch (error) {
        console.error('Profile fetch error:', error);
        return null;
      }
    }

    // Single subscription for the entire app.
    // Fires INITIAL_SESSION immediately, then handles sign in/out/token refresh.
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (session?.user) {
          // Set user/session but KEEP loading:true until profile is ready
          // This prevents dashboard from rendering before profile is available
          setState(prev => ({
            ...prev,
            user: session.user,
            session,
            error: null,
            // loading stays TRUE — don't release until profile ready
          }));

          // Fetch profile with retry — this is the critical data
          const profile = await withRetryOrNull(
            () => fetchProfile(session.user.id),
            {
              maxAttempts: 3,
              baseDelayMs: 150,
              onRetry: (attempt, error) => {
                console.warn(`Profile fetch retry ${attempt}:`, error.message);
              },
            }
          );

          // NOW set loading:false — profile fetch complete (success or failure)
          setState(prev => ({
            ...prev,
            profile,
            loading: false,
            error: profile ? null : 'Failed to load user profile',
          }));
        } else {
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
