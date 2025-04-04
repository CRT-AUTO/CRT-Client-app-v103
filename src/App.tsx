import React, { useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { supabase, checkSupabaseAuth, checkSupabaseDB } from './lib/supabase';
import { getCurrentUser } from './lib/auth';
import Layout from './components/Layout';
import Auth from './components/Auth';
import Dashboard from './pages/Dashboard';
import Settings from './pages/Settings';
import Messages from './pages/Messages';
import MessageDetail from './pages/MessageDetail';
import FacebookCallback from './pages/FacebookCallback';
import InstagramCallback from './pages/InstagramCallback';
import DeletionStatus from './pages/DeletionStatus';
import AdminLayout from './pages/admin/AdminLayout';
import AdminDashboard from './pages/admin/AdminDashboard';
import AdminUserManagement from './pages/admin/AdminUserManagement';
import AdminUserDetail from './pages/admin/AdminUserDetail';
import AdminWebhookSetup from './pages/admin/AdminWebhookSetup';
import AppErrorBoundary from './components/AppErrorBoundary';
import ConnectionStatus from './components/ConnectionStatus';
import type { User } from './types';

function App() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [debugInfo, setDebugInfo] = useState<string[]>([]);
  const [authStateChangeCalled, setAuthStateChangeCalled] = useState(false);

  const addDebugInfo = (message: string) => {
    console.log(message);
    setDebugInfo(prev => {
      // Limit to last 20 messages to prevent memory issues
      const newMessages = [...prev, `${new Date().toISOString().slice(11, 19)}: ${message}`];
      return newMessages.slice(-20);
    });
  };

  // Use a ref to track if initial auth state setup is complete
  const initialAuthComplete = React.useRef(false);

  // Separate useEffect for auth state change listener to avoid interaction with initialization
  useEffect(() => {
    let mounted = true;

    // Only set up listener if not already done
    if (!authStateChangeCalled) {
      addDebugInfo('Setting up auth state listener (first time)');
      setAuthStateChangeCalled(true);
      
      const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
        addDebugInfo(`Auth state changed: ${event}`);
        
        // Skip handling during initial load to prevent duplication
        if (!mounted || !initialAuthComplete.current) {
          addDebugInfo('Skipping auth change handler - initial auth not complete');
          return;
        }
        
        if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
          addDebugInfo(`Getting user data after ${event}`);
          try {
            const currentUser = await getCurrentUser();
            if (mounted) {
              setUser(currentUser);
              addDebugInfo(`User data updated: ${currentUser?.email || 'Unknown'}`);
            }
          } catch (userErr) {
            addDebugInfo(`Error getting user data: ${userErr instanceof Error ? userErr.message : 'Unknown error'}`);
          }
        } else if (event === 'SIGNED_OUT') {
          if (mounted) {
            setUser(null);
            addDebugInfo('User signed out');
          }
        }
      });

      return () => {
        addDebugInfo('Cleaning up auth state listener...');
        mounted = false;
        subscription.unsubscribe();
      };
    }
  }, [authStateChangeCalled]);

  // Main initialization effect
  useEffect(() => {
    let mounted = true;
    let retryCount = 0;
    const maxRetries = 3;
    
    addDebugInfo('App startup - initializing authentication');

    async function initializeAuth() {
      if (!mounted) return;
      
      if (initialAuthComplete.current) {
        addDebugInfo('Initial auth already completed, skipping redundant initialization');
        return;
      }
      
      try {
        addDebugInfo('Initializing auth...');
        setLoading(true);
        setError(null);

        // First, check if we can connect to Supabase auth services
        addDebugInfo('Checking Supabase connection...');
        const isAuthWorking = await checkSupabaseAuth();
        
        if (!isAuthWorking) {
          addDebugInfo('Authentication service connection failed');
          throw new Error('Unable to connect to authentication service');
        }
        
        addDebugInfo('Authentication service connection successful');

        // Check database connection but don't block on failure
        const isDBWorking = await checkSupabaseDB();
        if (!isDBWorking) {
          addDebugInfo('Database connection check failed - continuing anyway');
        } else {
          addDebugInfo('Database connection successful');
        }

        // Get the current session
        addDebugInfo('Fetching current session...');
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        
        if (sessionError) {
          addDebugInfo(`Session error: ${sessionError.message}`);
          throw sessionError;
        }

        if (!session) {
          addDebugInfo('No active session found');
          
          if (mounted) {
            setUser(null);
            setLoading(false);
            setAuthChecked(true);
            initialAuthComplete.current = true;
          }
          return;
        }

        // We have a session, get the user data
        addDebugInfo(`Active session found for user ID: ${session.user.id}`);
        addDebugInfo('Fetching current user data...');
        
        try {
          const currentUser = await getCurrentUser();
          
          if (mounted) {
            setUser(currentUser);
            addDebugInfo(`User data fetch complete: ${currentUser?.email || 'Unknown user'}`);
            initialAuthComplete.current = true;
          }
        } catch (userError) {
          addDebugInfo(`Error fetching user data: ${userError instanceof Error ? userError.message : 'Unknown error'}`);
          // Even if we can't get full user data, we have confirmation the user is authenticated
          if (mounted) {
            // Create a minimal user object from session data
            setUser({
              id: session.user.id,
              email: session.user.email || '',
              role: 'customer', // Default role
              created_at: session.user.created_at || new Date().toISOString()
            });
            addDebugInfo('Using minimal user data from session');
            initialAuthComplete.current = true;
          }
        }
      } catch (err) {
        addDebugInfo(`Error in initialization: ${err instanceof Error ? err.message : 'Unknown error'}`);
        console.error('Error initializing auth:', err);
        
        if (mounted && retryCount < maxRetries) {
          retryCount++;
          const delay = Math.min(1000 * retryCount, 5000); // Exponential backoff with max of 5 seconds
          addDebugInfo(`Retry ${retryCount}/${maxRetries} in ${delay}ms...`);
          
          setTimeout(initializeAuth, delay);
          return; // Don't update state yet, we're retrying
        }
        
        if (mounted) {
          setError('Failed to initialize application after multiple attempts. Please refresh the page.');
          initialAuthComplete.current = true; // Mark as complete even though it failed
        }
      } finally {
        if (mounted) {
          setLoading(false);
          setAuthChecked(true);
        }
      }
    }

    initializeAuth();

    return () => {
      mounted = false;
    };
  }, []); // Empty deps to only run once

  const handleRetry = () => {
    window.location.reload();
  };

  // Show clean loading spinner without debug info
  if (loading && !authChecked) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading application...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center max-w-md">
          <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-md mb-4">
            {error}
          </div>
          {debugInfo.length > 0 && (
            <div className="mb-4 p-4 text-left text-xs text-gray-500 bg-gray-50 rounded-md max-h-64 overflow-auto">
              <div className="font-semibold mb-1">Debug Information:</div>
              {debugInfo.map((info, idx) => (
                <div key={idx}>{info}</div>
              ))}
            </div>
          )}
          <button
            onClick={handleRetry}
            className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <AppErrorBoundary>
      <ConnectionStatus onRetry={handleRetry} />
      <BrowserRouter>
        <Routes>
          {!user ? (
            <>
              <Route path="/auth" element={<Auth />} />
              <Route path="/deletion-status" element={<DeletionStatus />} />
              <Route path="*" element={<Navigate to="/auth" replace />} />
            </>
          ) : (
            <>
              <Route element={<Layout />}>
                <Route path="/dashboard" element={<Dashboard />} />
                <Route path="/messages" element={<Messages />} />
                <Route path="/messages/:id" element={<MessageDetail />} />
                <Route path="/settings" element={<Settings />} />
              </Route>
              
              {user.role === 'admin' && (
                <Route path="/admin" element={<AdminLayout />}>
                  <Route index element={<AdminDashboard />} />
                  <Route path="users" element={<AdminUserManagement />} />
                  <Route path="users/:userId" element={<AdminUserDetail />} />
                  <Route path="webhooks" element={<AdminWebhookSetup />} />
                </Route>
              )}
              
              <Route path="/oauth/facebook/callback" element={<FacebookCallback />} />
              <Route path="/oauth/instagram/callback" element={<InstagramCallback />} />
              <Route path="/deletion-status" element={<DeletionStatus />} />
              <Route path="*" element={<Navigate to="/dashboard" replace />} />
            </>
          )}
        </Routes>
      </BrowserRouter>
    </AppErrorBoundary>
  );
}

export default App;
