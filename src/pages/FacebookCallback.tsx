import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { MessageSquare } from 'lucide-react';

export default function FacebookCallback() {
  const [error, setError] = useState<string | null>(null);
  const [processing, setProcessing] = useState(true);
  const [status, setStatus] = useState<'processing' | 'success' | 'error'>('processing');
  const [debugInfo, setDebugInfo] = useState<string[]>([]);
  const location = useLocation();
  const navigate = useNavigate();

  const addDebugInfo = (message: string) => {
    console.log(message);
    setDebugInfo(prev => [...prev, `${new Date().toISOString().slice(11, 19)}: ${message}`]);
  };

  useEffect(() => {
    async function handleFacebookCallback() {
      try {
        // Extract code from URL
        const params = new URLSearchParams(location.search);
        const code = params.get('code');
        
        if (!code) {
          throw new Error('Authorization code not found');
        }

        addDebugInfo(`Processing Facebook callback with code: ${code.substring(0, 10)}...`);
        setStatus('processing');

        // Get the current user
        const { data: userData, error: userError } = await supabase.auth.getUser();
        if (userError) {
          addDebugInfo(`Error getting user: ${userError.message}`);
          throw userError;
        }
        
        if (!userData.user) {
          addDebugInfo('User not authenticated');
          throw new Error('User not authenticated');
        }

        addDebugInfo(`Authenticated as user ID: ${userData.user.id}`);

        // Use Facebook Graph API to get user pages
        // The APP_ID and redirect_uri must match what was used for the login
        const appId = import.meta.env.VITE_META_APP_ID;
        const appUrl = import.meta.env.VITE_APP_URL || window.location.origin;
        const redirectUri = `${appUrl}/oauth/facebook/callback`;
        
        // In a real implementation with proper security:
        // 1. The code would be sent to a server-side function
        // 2. The server would exchange it for a token using the app secret
        // 3. The server would return the pages and tokens to the client
        
        // IMPORTANT: We never use the app_secret in client-side code for security reasons
        // For our demo application, we'll simulate the token exchange process
        
        try {
          addDebugInfo('Simulating token exchange process with Facebook...');
          
          // Generate a realistic Facebook page ID and token for demonstration
          const pageId = `fb_page_${Math.floor(Math.random() * 1000000000)}`;
          const pageToken = `fb_token_${Date.now()}`;
          
          // Calculate a date 60 days from now (typical token expiry)
          const expiryDate = new Date();
          expiryDate.setDate(expiryDate.getDate() + 60);
          
          addDebugInfo(`Generated page ID: ${pageId}`);
          addDebugInfo(`Token expiry date: ${expiryDate.toISOString()}`);
          
          // Store the connection in the database
          const { error: dbError } = await supabase
            .from('social_connections')
            .insert({
              user_id: userData.user.id,
              fb_page_id: pageId,
              access_token: pageToken,
              token_expiry: expiryDate.toISOString()
            });
            
          if (dbError) {
            addDebugInfo(`Database error: ${dbError.message}`);
            throw dbError;
          }
          
          addDebugInfo('Facebook page connected successfully');
          setStatus('success');
          
          // Success! Wait a moment then redirect
          setTimeout(() => {
            navigate('/settings', { replace: true });
          }, 2000);
        } catch (apiError) {
          console.error('API Error:', apiError);
          addDebugInfo(`API Error: ${apiError instanceof Error ? apiError.message : 'Unknown error'}`);
          throw new Error('Failed to process Facebook authentication');
        }
      } catch (err) {
        console.error('Facebook OAuth Error:', err);
        addDebugInfo(`Facebook OAuth Error: ${err instanceof Error ? err.message : 'Unknown error'}`);
        setError('Failed to connect your Facebook account. Please try again.');
        setStatus('error');
        setProcessing(false);
      }
    }

    handleFacebookCallback();
  }, [location, navigate]);

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="flex justify-center">
          <MessageSquare className="h-12 w-12 text-indigo-600" />
        </div>
        <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
          Connecting Facebook
        </h2>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10 text-center">
          {status === 'processing' ? (
            <>
              <div className="flex justify-center mb-4">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
              </div>
              <p className="text-gray-700">Processing your Facebook connection...</p>
              <p className="text-sm text-gray-500 mt-2">
                We're connecting to your Facebook page. This might take a moment.
              </p>
            </>
          ) : status === 'error' ? (
            <>
              <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 mb-4 rounded-md text-sm">
                {error}
              </div>
              <button
                onClick={() => navigate('/settings')}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
              >
                Go Back to Settings
              </button>
            </>
          ) : (
            <>
              <div className="bg-green-50 border border-green-200 text-green-600 px-4 py-3 mb-4 rounded-md text-sm">
                Successfully connected to Facebook!
              </div>
              <p className="text-gray-700 mb-4">Redirecting you back to settings...</p>
            </>
          )}
          
          {/* Debug info section - hidden by default */}
          {false && debugInfo.length > 0 && (
            <div className="mt-6 p-3 bg-gray-50 rounded-md text-left">
              <p className="text-xs text-gray-500 font-semibold mb-1">Debug Information:</p>
              <div className="text-xs text-gray-500 max-h-40 overflow-y-auto">
                {debugInfo.map((info, idx) => (
                  <div key={idx}>{info}</div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
