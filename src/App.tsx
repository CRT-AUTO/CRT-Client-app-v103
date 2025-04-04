import React, { useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { supabase } from './lib/supabase';
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

  useEffect(() => {
    let mounted = true;

    async function initializeAuth() {
      try {
        if (!mounted) return;
        
        setLoading(true);
        setError(null);

        console.log('Checking Supabase session...');
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        
        if (sessionError) {
          console.error('Error getting session:', sessionError);
          if (mounted) {
            setError('Failed to check authentication status');
            setLoading(false);
          }
          return;
        }

        console.log('Session check result:', session ? 'Session found' : 'No session');

        if (!session) {
          if (mounted) {
            setUser(null);
            setLoading(false);
            setAuthChecked(true);
          }
          return;
        }

        console.log('Getting user data...');
        const currentUser = await getCurrentUser();
        console.log('User data:', currentUser);
        
        if (mounted) {
          setUser(currentUser);
          setAuthChecked(true);
          setLoading(false);
        }
      } catch (err) {
        console.error('Error initializing auth:', err);
        if (mounted) {
          setError('Failed to initialize application');
          setLoading(false);
        }
      }
    }

    initializeAuth();

    console.log('Setting up auth state listener...');
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('Auth state changed:', event);
      if (!mounted) return;

      if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
        const currentUser = await getCurrentUser();
        setUser(currentUser);
      } else if (event === 'SIGNED_OUT') {
        setUser(null);
      }
    });

    return () => {
      mounted = false;
      console.log('Cleaning up auth state listener...');
      subscription.unsubscribe();
    };
  }, []);

  const handleRetry = () => {
    window.location.reload();
  };

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
        <div className="text-center">
          <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-md mb-4">
            {error}
          </div>
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

export default App
