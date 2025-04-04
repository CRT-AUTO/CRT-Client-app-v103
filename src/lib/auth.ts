import { supabase } from './supabase';
import type { User } from '../types';

export async function getCurrentUser(): Promise<User | null> {
  try {
    console.log('Getting current user...');
    
    // Get the current session first
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    
    if (sessionError) {
      console.error('Error getting session:', sessionError);
      return null;
    }

    if (!session?.user) {
      console.log('No active session found');
      return null;
    }

    // First try to get user data from the public users table
    try {
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('*')
        .eq('id', session.user.id)
        .single();

      if (!userError && userData) {
        return userData as User;
      } else {
        console.log('Could not find user in public.users table, checking auth.users or creating minimal user object');
      }
    } catch (e) {
      console.error('Error querying public.users table:', e);
    }

    // If that fails, create a minimal user object from session data
    console.log('Using session data to create minimal user object');
    return {
      id: session.user.id,
      email: session.user.email || '',
      role: session.user.user_metadata?.role || 'customer',
      created_at: session.user.created_at || new Date().toISOString()
    };
  } catch (error) {
    console.error('Unexpected error in getCurrentUser:', error);
    return null;
  }
}

export async function isAdmin(): Promise<boolean> {
  try {
    const { data: { session }, error } = await supabase.auth.getSession();
    
    if (error) {
      console.error('Error getting session:', error);
      return false;
    }

    if (!session?.user) {
      return false;
    }

    // First try to get role from users table
    try {
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('role')
        .eq('id', session.user.id)
        .single();

      if (!userError && userData) {
        return userData.role === 'admin';
      }
    } catch (e) {
      console.error('Error checking admin status in public.users table:', e);
    }

    // Fall back to user_metadata if table query fails
    return session.user.user_metadata?.role === 'admin';
  } catch (error) {
    console.error('Error checking admin status:', error);
    return false;
  }
}

export async function logout() {
  try {
    const { error } = await supabase.auth.signOut();
    if (error) {
      console.error('Error logging out:', error);
      throw error;
    }
  } catch (error) {
    console.error('Error during logout:', error);
    throw error;
  }
}
