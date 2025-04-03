import React, { useState, useEffect } from 'react';
import { Wifi, WifiOff, RefreshCw, AlertTriangle } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface ConnectionStatusProps {
  onRetry: () => void;
}

const ConnectionStatus: React.FC<ConnectionStatusProps> = ({ onRetry }) => {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [supabaseStatus, setSupabaseStatus] = useState<'checking' | 'connected' | 'disconnected'>('checking');
  
  // Check online status
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);
  
  // Check Supabase connection
  useEffect(() => {
    const checkSupabaseConnection = async () => {
      if (!isOnline) {
        setSupabaseStatus('disconnected');
        return;
      }
      
      try {
        setSupabaseStatus('checking');
        // Perform a simple ping to Supabase
        const { data, error } = await supabase.rpc('ping', {}, {
          count: 'exact',
          head: true
        });
        
        if (error) {
          console.error('Supabase connection check failed:', error);
          setSupabaseStatus('disconnected');
        } else {
          setSupabaseStatus('connected');
        }
      } catch (error) {
        console.error('Error checking Supabase connection:', error);
        setSupabaseStatus('disconnected');
      }
    };
    
    checkSupabaseConnection();
    
    // Check connection periodically
    const interval = setInterval(checkSupabaseConnection, 30000);
    return () => clearInterval(interval);
  }, [isOnline]);
  
  if (isOnline && supabaseStatus === 'connected') {
    return null; // Don't show anything when everything is working
  }
  
  return (
    <div className="fixed top-0 left-0 right-0 p-3 bg-red-500 text-white z-50">
      <div className="flex items-center justify-center">
        {!isOnline ? (
          <>
            <WifiOff className="h-5 w-5 mr-2" />
            <span>You are currently offline. Please check your internet connection.</span>
          </>
        ) : supabaseStatus === 'disconnected' ? (
          <>
            <AlertTriangle className="h-5 w-5 mr-2" />
            <span>Unable to connect to the server. Some features may not work correctly.</span>
          </>
        ) : (
          <>
            <div className="animate-spin rounded-full h-4 w-4 border-2 border-white mr-2"></div>
            <span>Checking connection...</span>
          </>
        )}
        <button
          onClick={onRetry}
          className="ml-4 inline-flex items-center px-3 py-1 bg-white bg-opacity-20 rounded text-white text-sm hover:bg-opacity-30"
        >
          <RefreshCw className="h-4 w-4 mr-1" />
          Retry
        </button>
      </div>
    </div>
  );
};

export default ConnectionStatus;