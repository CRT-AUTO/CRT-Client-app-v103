import React, { useState, useEffect } from 'react';
import { Wifi, WifiOff, RefreshCw, AlertTriangle } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface ConnectionStatusProps {
  onRetry: () => void;
}

const ConnectionStatus: React.FC<ConnectionStatusProps> = ({ onRetry }) => {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [supabaseStatus, setSupabaseStatus] = useState<'checking' | 'connected' | 'disconnected'>('checking');
  const [lastChecked, setLastChecked] = useState<Date | null>(null);
  const [checkCount, setCheckCount] = useState(0);
  
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
    let mounted = true;
    
    const checkSupabaseConnection = async () => {
      if (!isOnline) {
        setSupabaseStatus('disconnected');
        return;
      }
      
      // Don't check more than 10 times to avoid excessive API calls
      if (checkCount > 10) {
        return;
      }
      
      try {
        setSupabaseStatus('checking');
        
        // Simple anonymous check that doesn't require authentication
        const { error } = await supabase.from('users').select('count').limit(1).single();
        
        // We don't care if there are no rows - only if there's a connection error
        if (mounted) {
          if (error && error.code !== 'PGRST116') { // PGRST116 is "No rows returned" which is OK
            console.log('Supabase connection check failed:', error);
            setSupabaseStatus('disconnected');
          } else {
            setSupabaseStatus('connected');
          }
          
          setLastChecked(new Date());
          setCheckCount(prev => prev + 1);
        }
      } catch (error) {
        if (mounted) {
          console.error('Error checking Supabase connection:', error);
          setSupabaseStatus('disconnected');
          setLastChecked(new Date());
          setCheckCount(prev => prev + 1);
        }
      }
    };
    
    // Initial check
    checkSupabaseConnection();
    
    // Check connection periodically - but less frequently over time
    const interval = setInterval(checkSupabaseConnection, 
      checkCount < 5 ? 10000 : 30000); // Check more frequently at first, then slow down
    
    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, [isOnline, checkCount]);
  
  // Only show connection status warnings if actually having issues
  if (isOnline && supabaseStatus === 'connected') {
    return null;
  }
  
  // For disconnected state, only show after multiple checks to avoid false alarms
  if (supabaseStatus === 'disconnected' && checkCount < 2) {
    return null;
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
        {lastChecked && (
          <span className="ml-2 text-xs opacity-75">
            Last checked: {lastChecked.toLocaleTimeString()}
          </span>
        )}
      </div>
    </div>
  );
};

export default ConnectionStatus;
