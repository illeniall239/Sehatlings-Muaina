'use client';

import { createContext, useEffect, useState, useRef, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import type { User as SupabaseUser, Session } from '@supabase/supabase-js';

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

export interface SignInResult {
  data?: {
    user: SupabaseUser;
    session: Session;
    profile: UserProfile | null;
  };
  error?: unknown;
}

export interface AuthContextValue extends AuthState {
  signIn: (email: string, password: string) => Promise<SignInResult>;
  signUp: (email: string, password: string, metadata?: { firstName?: string; lastName?: string }) => Promise<{ data?: unknown; error?: unknown }>;
  signOut: () => Promise<{ error: unknown }>;
  isAuthenticated: boolean;
}

export const AuthContext = createContext<AuthContextValue | null>(null);

const initialState: AuthState = {
  user: null,
  profile: null,
  session: null,
  loading: true,
  error: null,
};

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AuthState>(initialState);
  const router = useRouter();
  const supabaseRef = useRef(createClient());

  // Fetch user profile and organization from database
  const fetchProfile = useCallback(async (userId: string): Promise<UserProfile | null> => {
    console.log('[Auth] Fetching profile for:', userId);

    const { data: userData, error: userError } = await supabaseRef.current
      .from('users')
      .select('id, email, role, profile, organization_id')
      .eq('id', userId)
      .single();

    if (userError) {
      console.error('[Auth] Profile fetch error:', userError);
      return null;
    }

    // Fetch organization if user has one
    let organization: UserProfile['organization'] = undefined;
    if (userData.organization_id) {
      const { data: orgData } = await supabaseRef.current
        .from('organizations')
        .select('id, name, slug')
        .eq('id', userData.organization_id)
        .single();

      if (orgData) {
        organization = orgData;
      }
    }

    return {
      id: userData.id,
      email: userData.email,
      role: userData.role,
      profile: userData.profile as UserProfile['profile'],
      organization_id: userData.organization_id,
      organization,
    };
  }, []);

  // Check session ONCE on mount - no subscriptions
  useEffect(() => {
    let isMounted = true;

    async function init() {
      console.log('[Auth] Checking session...');
      const { data: { session } } = await supabaseRef.current.auth.getSession();

      if (!isMounted) return;

      if (session?.user) {
        console.log('[Auth] Session found, fetching profile...');
        const profile = await fetchProfile(session.user.id);

        if (isMounted) {
          setState({
            user: session.user,
            profile,
            session,
            loading: false,
            error: profile ? null : 'Failed to load profile',
          });
        }
      } else {
        console.log('[Auth] No session');
        setState({ ...initialState, loading: false });
      }
    }

    init();

    return () => {
      isMounted = false;
    };
  }, [fetchProfile]);

  const signIn = useCallback(async (email: string, password: string) => {
    setState(prev => ({ ...prev, loading: true, error: null }));

    const { data, error } = await supabaseRef.current.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      setState(prev => ({ ...prev, loading: false, error: error.message }));
      return { error };
    }

    // Fetch profile after successful sign in
    const profile = await fetchProfile(data.user.id);

    setState({
      user: data.user,
      profile,
      session: data.session,
      loading: false,
      error: profile ? null : 'Failed to load profile',
    });

    router.refresh();
    return { data: { ...data, profile } };
  }, [fetchProfile, router]);

  const signUp = useCallback(async (
    email: string,
    password: string,
    metadata?: { firstName?: string; lastName?: string }
  ) => {
    setState(prev => ({ ...prev, loading: true, error: null }));

    const { data, error } = await supabaseRef.current.auth.signUp({
      email,
      password,
      options: {
        data: metadata,
      },
    });

    if (error) {
      setState(prev => ({ ...prev, loading: false, error: error.message }));
      return { error };
    }

    // For sign up, user might need email verification
    // Don't fetch profile yet - let them verify first
    setState(prev => ({ ...prev, loading: false }));
    return { data };
  }, []);

  const signOut = useCallback(async () => {
    setState(prev => ({ ...prev, loading: true }));

    const { error } = await supabaseRef.current.auth.signOut();

    if (error) {
      console.error('[Auth] Sign out error:', error);
    }

    // Always clear state and redirect, even if signOut had an error
    setState({ ...initialState, loading: false });
    router.push('/login');

    return { error };
  }, [router]);

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
