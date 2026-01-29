'use client';

import { createClient } from '@/lib/supabase/client';
import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import type { User as SupabaseUser, Session } from '@supabase/supabase-js';

interface UserProfile {
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

export function useAuth() {
  const [state, setState] = useState<AuthState>({
    user: null,
    profile: null,
    session: null,
    loading: true,
    error: null,
  });
  const router = useRouter();
  // Use ref for router to avoid it triggering useEffect re-runs
  const routerRef = useRef(router);
  routerRef.current = router;

  useEffect(() => {
    // createBrowserClient returns a singleton, safe to call here
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
          const { data: orgData, error: orgError } = await supabase
            .from('organizations')
            .select('id, name, slug')
            .eq('id', userData.organization_id)
            .single();

          if (orgError) {
            console.warn('Failed to fetch organization:', orgError.message);
          } else if (orgData) {
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
      } catch (error) {
        console.error('Profile fetch error:', error);
        return null;
      }
    }

    // Use onAuthStateChange as the sole auth mechanism.
    // It fires INITIAL_SESSION immediately with the current session,
    // then fires for all subsequent auth events (sign in, sign out, token refresh).
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (session?.user) {
          const profile = await fetchProfile(session.user.id);
          setState({
            user: session.user,
            profile,
            session,
            loading: false,
            error: profile ? null : 'Failed to load user profile',
          });
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
    // Empty deps - run once on mount. Router accessed via ref.
    // createBrowserClient returns a singleton so no dependency needed.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const signIn = async (email: string, password: string) => {
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
  };

  const signUp = async (
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
  };

  const signOut = async () => {
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
  };

  return {
    user: state.user,
    profile: state.profile,
    session: state.session,
    loading: state.loading,
    error: state.error,
    signIn,
    signUp,
    signOut,
    isAuthenticated: !!state.user,
  };
}
