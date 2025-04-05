import React, { useState, useEffect, useCallback } from 'react';
import { Wifi, WifiOff, RefreshCw, AlertTriangle } from 'lucide-react';
import { supabase, checkSupabaseDB } from '../lib/supabase';

interface ConnectionStatusProps {
  onRetry: () => void;
}

const ConnectionStatus: React.FC<ConnectionStatusProps> = ({ onRetry }) => {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [supabaseStatus, setSupabaseStatus] = useState<'checking' | 'connected' | 'disconnected'>('checking');
  const [lastChecked, setLastChecked] = useState<string>('');
  const [checkCount, setCheckCount] = useState(0);
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [debugInfo, setDebugInfo] = useState<string[]>([]);
  const [retryAttempts, setRetryAttempts] = useState(0);
  
  const addDebugInfo = (message: string) => {
    console.log(`Connection check: ${message}`);
    setDebugInfo(prev => [...prev.slice(-9), message]);
  };

  // Check online status
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      // Reset retry count when we go back online to allow immediate connection check
      setRetryAttempts(0);
    };
    const handleOffline = () => setIsOnline(false);
    
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);
  
  // Function to check Supabase connection with proper error handling
  const checkSupabaseConnection = useCallback(async () => {
    if (!isOnline) {
      setSupabaseStatus('disconnected');
      setErrorMessage('Your device is offline');
      addDebugInfo('Network offline, skipping Supabase check');
      return;
    }
    
    try {
      setSupabaseStatus('checking');
      addDebugInfo('Checking Supabase connection...');
      
      // Try the simple session check first as it'
