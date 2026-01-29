'use client';

import { createClient } from '@/lib/supabase/client';
import { useEffect, useState, useCallback, useRef, useMemo } from 'react';
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
  // Memoize client to prevent useEffect from re-running on every render
  const supabase = useMemo(() => createClient(), []);

  // Prevent race conditions with concurrent fetchProfile calls
  const fetchInProgressRef = useRef<string | null>(null);

  const fetchProfile = useCallback(async (userId: string): Promise<UserProfile | null> => {
    // Prevent concurrent fetches for the same user
    if (fetchInProgressRef.current === userId) {
      return null;
    }
    fetchInProgressRef.current = userId;

    try {
      // First fetch the user profile
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
        // Check if this is an RLS issue
        if (userError?.code === 'PGRST116' || userError?.message?.includes('recursion')) {
          console.warn(
            'Profile fetch failed due to RLS policy. Run supabase-rls-complete-fix.sql in Supabase SQL Editor.'
          );
        }
        return null;
      }

      // Then fetch the organization separately
      let organization = null;
      if (userData.organization_id) {
        const { data: orgData, error: orgError } = await supabase
          .from('organizations')
          .select('id, name, slug')
          .eq('id', userData.organization_id)
          .single();

        if (orgError) {
          console.warn('Failed to fetch organization:', {
            message: orgError.message,
            code: orgError.code,
            organizationId: userData.organization_id,
          });
          // Continue without organization - don't fail the whole profile
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
    } finally {
      fetchInProgressRef.current = null;
    }
  }, [supabase]);

  useEffect(() => {
    const initAuth = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        
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
      } catch (error) {
        console.error('Auth init error:', error);
        setState(prev => ({ ...prev, loading: false, error: 'Authentication failed' }));
      }
    };

    initAuth();

    // Listen for auth changes
    let subscription: { unsubscribe: () => void } | null = null;

    try {
      const { data } = supabase.auth.onAuthStateChange(
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

          // Refresh page data on sign in/out
          if (event === 'SIGNED_IN' || event === 'SIGNED_OUT') {
            router.refresh();
          }
        }
      );
      subscription = data.subscription;
    } catch (error) {
      console.error('Failed to set up auth state listener:', error);
    }

    return () => {
      // Safe cleanup - only unsubscribe if subscription was created
      if (subscription) {
        subscription.unsubscribe();
      }
    };
  }, [supabase, fetchProfile, router]);

  const signIn = async (email: string, password: string) => {
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
    setState(prev => ({ ...prev, loading: true }));

    try {
      const { error } = await supabase.auth.signOut();

      if (error) {
        console.error('Sign out failed:', error.message);
        setState(prev => ({ ...prev, loading: false, error: 'Failed to sign out' }));
        return { error };
      }

      // Clear state immediately on successful sign out
      setState({
        user: null,
        profile: null,
        session: null,
        loading: false,
        error: null,
      });

      // Navigate to login
      router.push('/login');
      return { error: null };
    } catch (error) {
      console.error('Sign out exception:', error);
      // Even on error, try to clear local state and redirect
      setState({
        user: null,
        profile: null,
        session: null,
        loading: false,
        error: 'Sign out failed unexpectedly',
      });
      router.push('/login');
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
