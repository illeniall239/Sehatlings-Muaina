import { createClient, SupabaseClient } from '@supabase/supabase-js';

/**
 * Service role client for admin operations
 * SECURITY: This client has full database access - only use server-side!
 */

// Cache the admin client to avoid creating multiple instances
// Note: In development, module caching can cause stale connections
let adminClientInstance: SupabaseClient | null = null;

// Function to clear cache (useful for development)
export function clearAdminClientCache() {
  adminClientInstance = null;
}

/**
 * Get the Supabase admin client (service role)
 * This function ensures:
 * 1. Only runs server-side
 * 2. Validates required environment variables
 * 3. Caches the client instance
 */
export function getSupabaseAdmin(): SupabaseClient {
  // Prevent client-side usage
  if (typeof window !== 'undefined') {
    throw new Error(
      'SECURITY ERROR: supabaseAdmin cannot be used in browser/client-side code. ' +
      'This would expose your service role key!'
    );
  }

  // Return cached instance if available
  if (adminClientInstance) {
    return adminClientInstance;
  }

  // Validate environment variables
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl) {
    throw new Error(
      'Missing NEXT_PUBLIC_SUPABASE_URL environment variable. ' +
      'Please configure it in your .env.local file.'
    );
  }

  if (!serviceRoleKey) {
    throw new Error(
      'Missing SUPABASE_SERVICE_ROLE_KEY environment variable. ' +
      'Please configure it in your .env.local file. ' +
      'Note: This key has full database access - keep it secure!'
    );
  }

  // Create and cache the admin client
  adminClientInstance = createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  return adminClientInstance;
}

// Legacy export for backward compatibility
// Using a getter ensures the validation runs when accessed
export const supabaseAdmin = new Proxy({} as SupabaseClient, {
  get(_, prop) {
    const client = getSupabaseAdmin();
    const value = client[prop as keyof SupabaseClient];
    if (typeof value === 'function') {
      return value.bind(client);
    }
    return value;
  },
});