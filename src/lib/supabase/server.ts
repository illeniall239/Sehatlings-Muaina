import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // The `setAll` method was called from a Server Component.
            // This can be ignored if you have middleware refreshing
            // user sessions.
          }
        },
      },
    }
  );
}

// Helper to get current user with profile data
export async function getCurrentUser() {
  const supabase = await createClient();
  
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    return null;
  }

  // Get user profile from our custom users table
  const { data: profile, error } = await supabase
    .from('users')
    .select('id, email, role, profile, organization_id, is_active')
    .eq('id', user.id)
    .single();

  if (error || !profile || !profile.is_active) {
    return null;
  }

  // Fetch organization separately to avoid relationship issues
  let organization = null;
  if (profile.organization_id) {
    const { data: orgData } = await supabase
      .from('organizations')
      .select('id, name, slug')
      .eq('id', profile.organization_id)
      .single();
    
    organization = orgData;
  }

  return {
    id: profile.id,
    email: profile.email,
    role: profile.role,
    profile: profile.profile as { first_name: string; last_name: string; title?: string; specialization?: string },
    organizationId: profile.organization_id,
    organization: organization as { id: string; name: string; slug: string } | null,
    authUser: user,
  };
}

// Helper to require authentication (throws if not authenticated)
export async function requireAuth() {
  const user = await getCurrentUser();
  
  if (!user) {
    throw new Error('Authentication required');
  }
  
  return user;
}
