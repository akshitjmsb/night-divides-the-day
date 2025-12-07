import { createClient, SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables. Please set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY');
}

export const supabase: SupabaseClient = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true
  }
});

let authPromise: Promise<string> | null = null;

/**
 * Returns the current authenticated user ID, or signs in anonymously if not authenticated.
 * This guarantees a valid user ID for RLS policies.
 */
export async function getUserId(): Promise<string> {
  const { data: { session } } = await supabase.auth.getSession();

  if (session?.user?.id) {
    return session.user.id;
  }

  // Combine multiple concurrent calls into a single sign-in request
  if (!authPromise) {
    authPromise = (async () => {
      console.log("No active session, signing in anonymously...");
      const { data, error } = await supabase.auth.signInAnonymously();

      if (error) {
        console.error("Error signing in anonymously:", error);
        throw error;
      }

      if (!data.user?.id) {
        throw new Error("Signed in anonymously but no user ID returned");
      }

      return data.user.id;
    })();
  }

  try {
    const userId = await authPromise;
    return userId;
  } finally {
    // Clear promise so subsequent failures can retry, 
    // but keep it briefly if successfully resolved to handle immediate subsequent calls
    // For now, simple clear on completion is safer to avoid stale state if something weird happens,
    // though strictly 'session.user.id' check above handles the cached case.
    authPromise = null;
  }
}

