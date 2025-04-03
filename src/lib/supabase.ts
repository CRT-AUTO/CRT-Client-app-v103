import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Missing Supabase environment variables:', { 
    supabaseUrl: supabaseUrl ? 'set' : 'missing', 
    supabaseAnonKey: 'hidden' // Don't log the key value
  });
}

export const supabase = createClient(supabaseUrl || '', supabaseAnonKey || '', {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    storageKey: 'supabase.auth.token'
  },
  global: {
    headers: {
      'Cache-Control': 'no-cache'
    }
  },
  realtime: {
    params: {
      eventsPerSecond: 2
    }
  }
});

// Helper function to check if we have working authentication
export async function checkSupabaseAuth() {
  try {
    const { data: { session }, error } = await supabase.auth.getSession();
    if (error) {
      console.error('Supabase authentication check failed:', error);
      return false;
    }
    return !!session;
  } catch (error) {
    console.error('Failed to check Supabase authentication:', error);
    return false;
  }
}

// Helper to log detailed errors from Supabase
export function logSupabaseError(operation: string, error: any) {
  const errorDetails = {
    operation,
    message: error?.message || 'Unknown error',
    code: error?.code,
    hint: error?.hint,
    details: error?.details,
    status: error?.status
  };
  
  console.error('Supabase error:', errorDetails);
}