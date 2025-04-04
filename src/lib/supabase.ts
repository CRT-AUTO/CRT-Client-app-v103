import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Add better debug logging
console.log(`Initializing Supabase client with URL: ${supabaseUrl ? 'Set (valid)' : 'Missing'}`);
console.log(`Supabase anon key: ${supabaseAnonKey ? 'Set (valid)' : 'Missing'}`);

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Missing Supabase environment variables:', {
    url: supabaseUrl ? 'set' : 'missing',
    anonKey: supabaseAnonKey ? 'set' : 'missing'
  });
  throw new Error('Supabase configuration is missing');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
    storageKey: 'supabase.auth.token'
  },
  global: {
    headers: { 
      'x-application-name': 'crt-tech',
      'Cache-Control': 'no-store'
    }
  }
});

// Helper function to check if we have working authentication
export async function checkSupabaseAuth() {
  try {
    console.log('Checking Supabase authentication connection...');
    const { data: { session }, error } = await supabase.auth.getSession();
    if (error) {
      console.error('Supabase authentication check failed:', error);
      return false;
    }
    console.log('Supabase authentication check successful:', session ? 'Active session' : 'No active session');
    return true;
  } catch (error) {
    console.error('Failed to check Supabase authentication:', error);
    return false;
  }
}

// Helper to check database connectivity
export async function checkSupabaseDB() {
  try {
    console.log('Checking Supabase database connection...');
    const { data, error } = await supabase.from('users').select('count').limit(1);
    if (error) {
      console.error('Supabase database check failed:', error);
      return false;
    }
    console.log('Supabase database check successful');
    return true;
  } catch (error) {
    console.error('Failed to check Supabase database:', error);
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
