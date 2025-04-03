import { supabase } from './supabase';
import { User } from '../types';

export async function getCurrentUser(): Promise<User | null> {
  try {
    // Get the current session first
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    
    if (sessionError) {
      console.error('Error getting session:', sessionError);
      return null;
    }

    if (!session?.user) {
      return null;
    }

    // Get user metadata from session
    const role = session.user.user_metadata?.role || 'customer';
    
    // Return user with role from metadata
    return {
      id: session.user.id,
      email: session.user.email || '',
      role: role,
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