'use client';

import { createClient } from '@/lib/supabase/client';
import { useEffect, useState, useCallback } from 'react';
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
}

export function useAuth() {
  const [state, setState] = useState<AuthState>({
    user: null,
    profile: null,
    session: null,
    loading: true,
  });
  const router = useRouter();
  const supabase = createClient();

  const fetchProfile = useCallback(async (userId: string): Promise<UserProfile | null> => {
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

      if (!orgError && orgData) {
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
          });
        } else {
          setState({
            user: null,
            profile: null,
            session: null,
            loading: false,
          });
        }
      } catch (error) {
        console.error('Auth init error:', error);
        setState(prev => ({ ...prev, loading: false }));
      }
    };

    initAuth();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (session?.user) {
          const profile = await fetchProfile(session.user.id);
          setState({
            user: session.user,
            profile,
            session,
            loading: false,
          });
        } else {
          setState({
            user: null,
            profile: null,
            session: null,
            loading: false,
          });
        }

        // Refresh page data on sign in/out
        if (event === 'SIGNED_IN' || event === 'SIGNED_OUT') {
          router.refresh();
        }
      }
    );

    return () => {
      subscription.unsubscribe();
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
    
    const { error } = await supabase.auth.signOut();
    
    if (!error) {
      router.push('/login');
    }
    
    return { error };
  };

  return {
    user: state.user,
    profile: state.profile,
    session: state.session,
    loading: state.loading,
    signIn,
    signUp,
    signOut,
    isAuthenticated: !!state.user,
  };
}
