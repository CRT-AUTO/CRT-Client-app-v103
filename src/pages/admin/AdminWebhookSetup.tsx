import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { 
  Webhook, RefreshCw, Copy, Check, AlertTriangle, Globe, 
  Link as LinkIcon, Plus, Edit, Trash2, Facebook, Instagram, 
  MessageSquare, MoreHorizontal, Clipboard, CheckCircle, AlertCircle,
  Smartphone, X, Search
} from 'lucide-react';
import { 
  getWebhookConfigs, getUserById, updateWebhookConfig, 
  createWebhookConfig, getUserSummaries, deleteWebhookConfig 
} from '../../lib/api';
import { WebhookConfig, UserSummary } from '../../types';
import LoadingIndicator from '../../components/LoadingIndicator';
import ErrorAlert from '../../components/ErrorAlert';

export default function AdminWebhookSetup() {
  const [webhooks, setWebhooks] = useState<WebhookConfig[]>([]);
  const [users, setUsers] = useState<UserSummary[]>([]);
  const [userMap, setUserMap] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [selectedWebhook, setSelectedWebhook] = useState<WebhookConfig | null>(null);
  
  // Create/Edit webhook form state
  const [formState, setFormState] = useState({
    userId: '',
    platform: 'facebook',
    channelName: '',
    webhookName: '',
    webhookUrl: '',
    verificationToken: '',
    isActive: false,
    channelId: '',
  });
  
  // Filtering and sorting
  const [selectedUser, setSelectedUser] = useState<string>('all');
  const [selectedPlatform, setSelectedPlatform] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortField, setSortField] = useState<'user' | 'platform' | 'updated'>('updated');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Load users and webhook configurations in parallel
      const [userSummaries, webhookConfigs] = await Promise.all([
        getUserSummaries(),
        getWebhookConfigs()
      ]);
      
      setUsers(userSummaries);
      setWebhooks(webhookConfigs);
      
      // Create a map of user IDs to email addresses
      const userMapData: Record<string, string> = {};
      userSummaries.forEach(user => {
        userMapData[user.id] = user.email;
      });
      setUserMap(userMapData);
      
      setLoading(false);
    } catch (err) {
      console.error('Error loading webhook data:', err);
      setError('Failed to load webhook configurations. Please try again.');
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    try {
      setRefreshing(true);
      setError(null);
      await loadData();
    } catch (err) {
      setError('Failed to refresh data. Please try again.');
    } finally {
      setRefreshing(false);
    }
  };

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text).then(
      () => {
        setCopied(id);
        setTimeout(() => setCopied(null), 3000);
      },
      (err) => {
        console.error('Could not copy text: ', err);
      }
    );
  };
  
  const generateWebhookUrl = async (webhook: WebhookConfig) => {
    try {
      if (!webhook.user_id) {
        throw new Error('Webhook has no associated user ID');
      }
      
      // Generate a unique URL based on the user ID, platform and channel
      const baseUrl = window.location.origin;
      const platform = webhook.platform || 'all';
      const channel = webhook.channel_name || 'default';
      const timestamp = Date.now();
      const generatedUrl = `${baseUrl}/api/webhooks/${webhook.user_id}/${platform}/${channel}/${timestamp}`;
      
      // Generate a random verification token if not set
      const verificationToken = webhook.verification_token || 
        Math.random().toString(36).substring(2, 15) + 
        Math.random().toString(36).substring(2, 15);
      
      // Update the webhook config with the generated URL
      await updateWebhookConfig(webhook.id, { 
        generated_url: generatedUrl,
        verification_token: verificationToken
      });
      
      // Refresh the data
      await loadData();
    } catch (err) {
      console.error('Error generating webhook URL:', err);
      setError('Failed to generate webhook URL');
    }
  };
  
  // Filter webhooks based on selected filters
  const filteredWebhooks = webhooks.filter(webhook => {
    // Filter by user
    if (selectedUser !== 'all' && webhook.user_id !== selectedUser) {
      return false;
    }
    
    // Filter by platform
    if (selectedPlatform !== 'all' && webhook.platform !== selectedPlatform) {
      return false;
    }
    
    // Search by webhook name, channel name, or user email
    if (searchQuery) {
      const userEmail = userMap[webhook.user_id || ''] || '';
      const webhookName = webhook.webhook_name || '';
      const channelName = webhook.channel_name || '';
      
      const searchLower = searchQuery.toLowerCase();
      if (
        !userEmail.toLowerCase().includes(searchLower) &&
        !webhookName.toLowerCase().includes(searchLower) &&
        !channelName.toLowerCase().includes(searchLower)
      ) {
        return false;
      }
    }
    
    return true;
  });
  
  // Sort webhooks
  const sortedWebhooks = [...filteredWebhooks].sort((a, b) => {
    if (sortField === 'user') {
      const emailA = userMap[a.user_id || ''] || '';
      const emailB = userMap[b.user_id || ''] || '';
      return sortDirection === 'asc' 
        ? emailA.localeCompare(emailB)
        : emailB.localeCompare(emailA);
    }
    
    if (sortField === 'platform') {
      const platformA = a.platform || 'all';
      const platformB = b.platform || 'all';
      return sortDirection === 'asc'
        ? platformA.localeCompare(platformB)
        : platformB.localeCompare(platformA);
    }
    
    // Sort by updated_at date
    const dateA = new Date(a.updated_at || a.created_at || '').getTime();
    const dateB = new Date(b.updated_at || b.created_at || '').getTime();
    return sortDirection === 'asc' ? dateA - dateB : dateB - dateA;
  });
  
  // Handle form changes
  const handleFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    
    setFormState(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : value
    }));
  };
  
  // Reset form state
  const resetForm = () => {
    setFormState({
      userId: '',
      platform: 'facebook',
      channelName: '',
      webhookName: '',
      webhookUrl: '',
      verificationToken: '',
      isActive: false,
      channelId: '',
    });
  };
  
  // Open create modal
  const handleCreateWebhook = () => {
    resetForm();
    setShowCreateModal(true);
  };
  
  // Open edit modal
  const handleEditWebhook = (webhook: WebhookConfig) => {
    setSelectedWebhook(webhook);
    setFormState({
      userId: webhook.user_id || '',
      platform: webhook.platform || 'facebook',
      channelName: webhook.channel_name || '',
      webhookName: webhook.webhook_name || '',
      webhookUrl: webhook.webhook_url || '',
      verificationToken: webhook.verification_token || '',
      isActive: webhook.is_active || false,
      channelId: webhook.channel_id || '',
    });
    setShowEditModal(true);
  };
  
  // Handle delete confirmation
  const handleDeleteConfirm = (webhook: WebhookConfig) => {
    setSelectedWebhook(webhook);
    setShowDeleteConfirm(true);
  };
  
  // Submit create webhook form
  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (!formState.userId) {
        setError('Please select a user');
        return;
      }
      
      // Generate a random verification token if not provided
      const verificationToken = formState.verificationToken || 
        Math.random().toString(36).substring(2, 15) + 
        Math.random().toString(36).substring(2, 15);
      
      // Generate a unique webhook URL if not provided
      const baseUrl = window.location.origin;
      const platform = formState.platform;
      const channel = formState.channelName || 'default';
      const timestamp = Date.now();
      const generatedUrl = formState.webhookUrl || 
        `${baseUrl}/api/webhooks/${formState.userId}/${platform}/${channel}/${timestamp}`;
      
      // Create the webhook config
      await createWebhookConfig({
        user_id: formState.userId,
        platform: formState.platform as any,
        channel_name: formState.channelName,
        webhook_name: formState.webhookName,
        webhook_url: formState.webhookUrl,
        verification_token: verificationToken,
        is_active: formState.isActive,
        generated_url: generatedUrl,
        channel_id: formState.channelId,
        meta_verification_status: 'pending'
      });
      
      // Refresh the data
      await loadData();
      
      // Close the modal
      setShowCreateModal(false);
    } catch (err) {
      console.error('Error creating webhook:', err);
      setError('Failed to create webhook. Please try again.');
    }
  };
  
  // Submit edit webhook form
  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (!selectedWebhook) {
        setError('No webhook selected for editing');
        return;
      }
      
      // Update the webhook config
      await updateWebhookConfig(selectedWebhook.id, {
        platform: formState.platform as any,
        channel_name: formState.channelName,
        webhook_name: formState.webhookName,
        webhook_url: formState.webhookUrl,
        verification_token: formState.verificationToken,
        is_active: formState.isActive,
        channel_id: formState.channelId
      });
      
      // Refresh the data
      await loadData();
      
      // Close the modal
      setShowEditModal(false);
    } catch (err) {
      console.error('Error updating webhook:', err);
      setError('Failed to update webhook. Please try again.');
    }
  };
  
  // Delete webhook
  const handleDelete = async () => {
    try {
      if (!selectedWebhook) {
        setError('No webhook selected for deletion');
        return;
      }
      
      // Delete the webhook config
      await deleteWebhookConfig(selectedWebhook.id);
      
      // Refresh the data
      await loadData();
      
      // Close the confirmation dialog
      setShowDeleteConfirm(false);
      
      // Clear selected webhook
      setSelectedWebhook(null);
    } catch (err) {
      console.error('Error deleting webhook:', err);
      setError('Failed to delete webhook. Please try again.');
    }
  };
  
  // Get platform icon
  const getPlatformIcon = (platform?: string) => {
    switch (platform) {
      case 'facebook':
        return <Facebook className="h-4 w-4 text-blue-600" />;
      case 'instagram':
        return <Instagram className="h-4 w-4 text-pink-600" />;
      case 'whatsapp':
        return <Smartphone className="h-4 w-4 text-green-600" />;
      default:
        return <Globe className="h-4 w-4 text-gray-600" />;
    }
  };
  
  // Format date
  const formatDate = (dateString?: string) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleString();
  };

  if (loading) {
    return <LoadingIndicator message="Loading webhook configurations..." />;
  }

  return (
    <div className="space-y-6">
      {error && (
        <ErrorAlert 
          message="Error" 
          details={error} 
          onDismiss={() => setError(null)} 
        />
      )}
      
      {/* Header with actions */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center space-y-4 sm:space-y-0">
        <div>
          <h2 className="text-xl font-semibold text-gray-700">Webhook Configurations</h2>
          <p className="text-gray-500">Configure and manage webhooks for Meta platforms</p>
        </div>
        
        <div className="flex items-center space-x-4">
          <button
            onClick={handleCreateWebhook}
            className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Webhook
          </button>
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
          >
            {refreshing ? (
              <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4 mr-2" />
            )}
            Refresh
          </button>
        </div>
      </div>
      
      {/* Filters */}
      <div className="bg-white shadow rounded-lg p-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label htmlFor="user-filter" className="block text-sm font-medium text-gray-700 mb-1">
              Filter by User
            </label>
            <select
              id="user-filter"
              value={selectedUser}
              onChange={(e) => setSelectedUser(e.target.value)}
              className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md"
            >
              <option value="all">All Users</option>
              {users.map(user => (
                <option key={user.id} value={user.id}>
                  {user.email}
                </option>
              ))}
            </select>
          </div>
          
          <div>
            <label htmlFor="platform-filter" className="block text-sm font-medium text-gray-700 mb-1">
              Filter by Platform
            </label>
            <select
              id="platform-filter"
              value={selectedPlatform}
              onChange={(e) => setSelectedPlatform(e.target.value)}
              className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md"
            >
              <option value="all">All Platforms</option>
              <option value="facebook">Facebook</option>
              <option value="instagram">Instagram</option>
              <option value="whatsapp">WhatsApp</option>
            </select>
          </div>
          
          <div>
            <label htmlFor="search-webhooks" className="block text-sm font-medium text-gray-700 mb-1">
              Search
            </label>
            <div className="relative rounded-md shadow-sm">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Search className="h-5 w-5 text-gray-400" />
              </div>
              <input
                type="text"
                id="search-webhooks"
                className="focus:ring-indigo-500 focus:border-indigo-500 block w-full pl-10 sm:text-sm border-gray-300 rounded-md"
                placeholder="Search webhooks..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>
          
          <div>
            <label htmlFor="sort-by" className="block text-sm font-medium text-gray-700 mb-1">
              Sort by
            </label>
            <div className="flex items-center space-x-2">
              <select
                id="sort-by"
                value={sortField}
                onChange={(e) => setSortField(e.target.value as any)}
                className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md"
              >
                <option value="updated">Last Updated</option>
                <option value="user">User Email</option>
                <option value="platform">Platform</option>
              </select>
              <button
                onClick={() => setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')}
                className="inline-flex items-center p-2 border border-gray-300 rounded-md text-gray-700 bg-white hover:bg-gray-50"
              >
                {sortDirection === 'asc' ? (
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                    <path d="M3 3a1 1 0 000 2h11a1 1 0 100-2H3zM3 7a1 1 0 000 2h7a1 1 0 100-2H3zM3 11a1 1 0 100 2h4a1 1 0 100-2H3zM15 8a1 1 0 10-2 0v5.586l-1.293-1.293a1 1 0 00-1.414 1.414l3 3a1 1 0 001.414 0l3-3a1 1 0 00-1.414-1.414L15 13.586V8z" />
                  </svg>
                ) : (
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                    <path d="M3 3a1 1 0 000 2h11a1 1 0 100-2H3zM3 7a1 1 0 000 2h7a1 1 0 100-2H3zM3 11a1 1 0 100 2h4a1 1 0 100-2H3zM15 8a1 1 0 10-2 0v5.586l-1.293-1.293a1 1 0 00-1.414 1.414l3 3a1 1 0 001.414 0l3-3a1 1 0 00-1.414-1.414L15 13.586V8z" />
                  </svg>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
      
      {/* Setup Instructions */}
      <div className="bg-white shadow rounded-lg overflow-hidden">
        <div className="px-4 py-5 sm:px-6 flex items-center">
          <Webhook className="h-6 w-6 text-indigo-600 mr-2" />
          <h3 className="text-lg leading-6 font-medium text-gray-900">Meta Webhook Setup Instructions</h3>
        </div>
        <div className="border-t border-gray-200 px-4 py-5 sm:p-6">
          <div className="prose max-w-none">
            <p>
              To set up Meta webhooks for your customers, follow these steps:
            </p>
            
            <ol className="list-decimal pl-5 space-y-2">
              <li>
                Go to the <a href="https://developers.facebook.com/" target="_blank" rel="noopener noreferrer" className="text-indigo-600 hover:text-indigo-500">Meta Developers Portal</a> and select your app.
              </li>
              <li>
                Navigate to "Webhooks" in the sidebar and click "Add Subscription".
              </li>
              <li>
                Select the appropriate webhook for the platform (Facebook Page or Instagram).
              </li>
              <li>
                Enter the Callback URL for the user (shown in the table below).
              </li>
              <li>
                Enter the Verification Token for the user (shown in the table below).
              </li>
              <li>
                Select the appropriate webhook fields:
                <ul className="list-disc pl-5 mt-1">
                  <li>For Facebook Pages: <code>messages, messaging_postbacks, message_deliveries, message_reads</code></li>
                  <li>For Instagram: <code>messages, messaging_postbacks</code></li>
                  <li>For WhatsApp: <code>messages</code></li>
                </ul>
              </li>
              <li>
                Click "Verify and Save" to complete the webhook setup.
              </li>
              <li>
                After successful verification, Meta will provide a webhook token for that specific channel. Add this token to the webhook configuration.
              </li>
            </ol>
            
            <div className="mt-4 p-4 bg-yellow-50 rounded-md">
              <div className="flex">
                <div className="flex-shrink-0">
                  <AlertTriangle className="h-5 w-5 text-yellow-400" />
                </div>
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-yellow-800">Important Notes</h3>
                  <div className="mt-2 text-sm text-yellow-700">
                    <ul className="list-disc pl-5 space-y-1">
                      <li>Configure separate webhooks for each platform and channel combination.</li>
                      <li>Make sure each webhook has a unique channel name to avoid conflicts.</li>
                      <li>When Meta verifies your webhook, they'll provide a webhook token to store.</li>
                      <li>Webhooks will only work for users with valid access tokens for that platform.</li>
                      <li>Different channels (e.g., different Facebook pages) must have separate webhook configurations.</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      {/* Webhook Configurations Table */}
      <div className="bg-white shadow rounded-lg overflow-hidden">
        <div className="px-4 py-5 sm:px-6 flex justify-between items-center">
          <h3 className="text-lg leading-6 font-medium text-gray-900">
            {filteredWebhooks.length > 0 
              ? `Webhook Configurations (${filteredWebhooks.length})` 
              : 'No Webhooks Configured'}
          </h3>
          <span className="text-sm text-gray-500">
            {searchQuery && `Search: "${searchQuery}"`}
            {selectedUser !== 'all' && selectedPlatform !== 'all' && ` • `}
            {selectedUser !== 'all' && `User: ${userMap[selectedUser] || selectedUser}`}
            {selectedUser !== 'all' && selectedPlatform !== 'all' && ` • `}
            {selectedPlatform !== 'all' && `Platform: ${selectedPlatform}`}
          </span>
        </div>
        
        {sortedWebhooks.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    User/Channel
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Platform/Status
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Webhook URL
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Verification
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Last Updated
                  </th>
                  <th scope="col" className="relative px-6 py-3">
                    <span className="sr-only">Actions</span>
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {sortedWebhooks.map((webhook) => (
                  <tr key={webhook.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="flex-shrink-0 h-10 w-10 rounded-full bg-gray-200 flex items-center justify-center">
                          <span className="text-gray-500">
                            {userMap[webhook.user_id || '']?.charAt(0).toUpperCase() || '?'}
                          </span>
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-gray-900">
                            {userMap[webhook.user_id || ''] || 'Unknown User'}
                          </div>
                          <div className="text-xs text-gray-500">
                            {webhook.webhook_name || 'Unnamed Webhook'}
                          </div>
                          {webhook.channel_name && (
                            <div className="text-xs text-indigo-600 mt-1">
                              Channel: {webhook.channel_name}
                            </div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex flex-col space-y-1">
                        <span className="px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full items-center">
                          {getPlatformIcon(webhook.platform)}
                          <span className="ml-1">{webhook.platform || 'all'}</span>
                        </span>
                        
                        <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                          webhook.is_active
                            ? 'bg-green-100 text-green-800'
                            : 'bg-gray-100 text-gray-800'
                        }`}>
                          {webhook.is_active ? (
                            <CheckCircle className="h-3 w-3 mr-1" />
                          ) : (
                            <AlertCircle className="h-3 w-3 mr-1" />
                          )}
                          {webhook.is_active ? 'Active' : 'Inactive'}
                        </span>
                        
                        <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                          (webhook.meta_verification_status === 'verified')
                            ? 'bg-blue-100 text-blue-800'
                            : (webhook.meta_verification_status === 'failed')
                              ? 'bg-red-100 text-red-800' 
                              : 'bg-yellow-100 text-yellow-800'
                        }`}>
                          {webhook.meta_verification_status || 'pending'}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm">
                        <div className="mb-1">
                          <span className="text-xs text-gray-500">Custom URL:</span>
                          <div className="flex items-center">
                            <div className="w-48 truncate text-xs text-gray-900">
                              {webhook.webhook_url || "Not configured"}
                            </div>
                            {webhook.webhook_url && (
                              <button
                                onClick={() => copyToClipboard(webhook.webhook_url || "", `url-${webhook.id}`)}
                                className="ml-2 text-gray-400 hover:text-gray-600"
                              >
                                {copied === `url-${webhook.id}` ? (
                                  <Check className="h-4 w-4 text-green-500" />
                                ) : (
                                  <Copy className="h-4 w-4" />
                                )}
                              </button>
                            )}
                          </div>
                        </div>
                        
                        <div>
                          <span className="text-xs text-gray-500">Generated URL:</span>
                          <div className="flex items-center">
                            <div className="w-48 truncate text-xs text-gray-900">
                              {webhook.generated_url || "Not generated"}
                            </div>
                            {webhook.generated_url ? (
                              <button
                                onClick={() => copyToClipboard(webhook.generated_url || "", `gen-${webhook.id}`)}
                                className="ml-2 text-gray-400 hover:text-gray-600"
                              >
                                {copied === `gen-${webhook.id}` ? (
                                  <Check className="h-4 w-4 text-green-500" />
                                ) : (
                                  <Copy className="h-4 w-4" />
                                )}
                              </button>
                            ) : (
                              <button
                                onClick={() => generateWebhookUrl(webhook)}
                                className="ml-2 text-indigo-600 hover:text-indigo-700"
                                title="Generate URL"
                              >
                                <LinkIcon className="h-4 w-4" />
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm">
                        <div className="mb-1">
                          <span className="text-xs text-gray-500">Verification Token:</span>
                          <div className="flex items-center">
                            <div className="text-xs text-gray-900 font-mono">
                              {webhook.verification_token 
                                ? `${webhook.verification_token.substring(0, 8)}...` 
                                : "Not configured"}
                            </div>
                            {webhook.verification_token && (
                              <button
                                onClick={() => copyToClipboard(webhook.verification_token || "", `token-${webhook.id}`)}
                                className="ml-2 text-gray-400 hover:text-gray-600"
                                title="Copy full token"
                              >
                                {copied === `token-${webhook.id}` ? (
                                  <Check className="h-4 w-4 text-green-500" />
                                ) : (
                                  <Copy className="h-4 w-4" />
                                )}
                              </button>
                            )}
                          </div>
                        </div>
                        
                        <div>
                          <span className="text-xs text-gray-500">Webhook Token:</span>
                          <div className="flex items-center">
                            <div className="text-xs text-gray-900 font-mono">
                              {webhook.webhook_token 
                                ? `${webhook.webhook_token.substring(0, 8)}...` 
                                : "No token yet"}
                            </div>
                            {webhook.webhook_token && (
                              <button
                                onClick={() => copyToClipboard(webhook.webhook_token || "", `wtoken-${webhook.id}`)}
                                className="ml-2 text-gray-400 hover:text-gray-600"
                                title="Copy full webhook token"
                              >
                                {copied === `wtoken-${webhook.id}` ? (
                                  <Check className="h-4 w-4 text-green-500" />
                                ) : (
                                  <Copy className="h-4 w-4" />
                                )}
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {formatDate(webhook.updated_at || webhook.created_at)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex items-center space-x-3 justify-end">
                        <button
                          onClick={() => handleEditWebhook(webhook)}
                          className="text-indigo-600 hover:text-indigo-900"
                          title="Edit"
                        >
                          <Edit className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteConfirm(webhook)}
                          className="text-red-600 hover:text-red-900"
                          title="Delete"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                        <Link
                          to={`/admin/users/${webhook.user_id}`}
                          className="text-gray-600 hover:text-gray-900"
                          title="View User"
                        >
                          <User className="h-4 w-4" />
                        </Link>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="px-4 py-12 text-center border-t border-gray-200">
            <Webhook className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">No webhooks found</h3>
            <p className="mt-1 text-sm text-gray-500">
              {searchQuery || selectedUser !== 'all' || selectedPlatform !== 'all' 
                ? 'Try adjusting your filters or search query'
                : 'Get started by creating a new webhook configuration'}
            </p>
            <div className="mt-6">
              <button
                onClick={handleCreateWebhook}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
              >
                <Plus className="h-5 w-5 mr-2" />
                Add Webhook
              </button>
            </div>
          </div>
        )}
      </div>
      
      {/* Create Webhook Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-10 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" aria-hidden="true"></div>
            <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>
            <div className="inline-block align-bottom bg-white rounded-lg px-4 pt-5 pb-4 text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full sm:p-6">
              <div className="sm:flex sm:items-start">
                <div className="mx-auto flex-shrink-0 flex items-center justify-center h-12 w-12 rounded-full bg-indigo-100 sm:mx-0 sm:h-10 sm:w-10">
                  <Webhook className="h-6 w-6 text-indigo-600" />
                </div>
                <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left w-full">
                  <h3 className="text-lg leading-6 font-medium text-gray-900">Add New Webhook</h3>
                  <div className="mt-2">
                    <form onSubmit={handleCreateSubmit} className="space-y-4">
                      <div>
                        <label htmlFor="userId" className="block text-sm font-medium text-gray-700">
                          User <span className="text-red-500">*</span>
                        </label>
                        <select
                          id="userId"
                          name="userId"
                          value={formState.userId}
                          onChange={handleFormChange}
                          required
                          className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md"
                        >
                          <option value="">Select a User</option>
                          {users.map(user => (
                            <option key={user.id} value={user.id}>
                              {user.email}
                            </option>
                          ))}
                        </select>
                      </div>
                      
                      <div>
                        <label htmlFor="platform" className="block text-sm font-medium text-gray-700">
                          Platform <span className="text-red-500">*</span>
                        </label>
                        <select
                          id="platform"
                          name="platform"
                          value={formState.platform}
                          onChange={handleFormChange}
                          required
                          className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md"
                        >
                          <option value="facebook">Facebook</option>
                          <option value="instagram">Instagram</option>
                          <option value="whatsapp">WhatsApp</option>
                          <option value="all">All Platforms</option>
                        </select>
                      </div>
                      
                      <div>
                        <label htmlFor="webhookName" className="block text-sm font-medium text-gray-700">
                          Webhook Name
                        </label>
                        <input
                          type="text"
                          id="webhookName"
                          name="webhookName"
                          value={formState.webhookName}
                          onChange={handleFormChange}
                          placeholder="E.g., Primary Facebook Webhook"
                          className="mt-1 focus:ring-indigo-500 focus:border-indigo-500 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md"
                        />
                      </div>
                      
                      <div>
                        <label htmlFor="channelName" className="block text-sm font-medium text-gray-700">
                          Channel Name <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="text"
                          id="channelName"
                          name="channelName"
                          value={formState.channelName}
                          onChange={handleFormChange}
                          required
                          placeholder="E.g., main-page, support-channel"
                          className="mt-1 focus:ring-indigo-500 focus:border-indigo-500 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md"
                        />
                        <p className="mt-1 text-xs text-gray-500">A unique identifier for this channel</p>
                      </div>
                      
                      <div>
                        <label htmlFor="channelId" className="block text-sm font-medium text-gray-700">
                          Channel ID
                        </label>
                        <input
                          type="text"
                          id="channelId"
                          name="channelId"
                          value={formState.channelId}
                          onChange={handleFormChange}
                          placeholder="E.g., page123456789"
                          className="mt-1 focus:ring-indigo-500 focus:border-indigo-500 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md"
                        />
                        <p className="mt-1 text-xs text-gray-500">The platform-specific ID for this channel (if known)</p>
                      </div>
                      
                      <div>
                        <label htmlFor="webhookUrl" className="block text-sm font-medium text-gray-700">
                          Custom Webhook URL
                        </label>
                        <input
                          type="text"
                          id="webhookUrl"
                          name="webhookUrl"
                          value={formState.webhookUrl}
                          onChange={handleFormChange}
                          placeholder="https://example.com/webhook-endpoint"
                          className="mt-1 focus:ring-indigo-500 focus:border-indigo-500 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md"
                        />
                        <p className="mt-1 text-xs text-gray-500">Leave blank to auto-generate</p>
                      </div>
                      
                      <div>
                        <label htmlFor="verificationToken" className="block text-sm font-medium text-gray-700">
                          Verification Token
                        </label>
                        <input
                          type="text"
                          id="verificationToken"
                          name="verificationToken"
                          value={formState.verificationToken}
                          onChange={handleFormChange}
                          placeholder="Custom verification token"
                          className="mt-1 focus:ring-indigo-500 focus:border-indigo-500 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md"
                        />
                        <p className="mt-1 text-xs text-gray-500">Leave blank to auto-generate</p>
                      </div>
                      
                      <div className="flex items-center">
                        <input
                          id="isActive"
                          name="isActive"
                          type="checkbox"
                          checked={formState.isActive}
                          onChange={handleFormChange}
                          className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                        />
                        <label htmlFor="isActive" className="ml-2 block text-sm text-gray-900">
                          Active
                        </label>
                      </div>
                      
                      <div className="mt-5 sm:mt-4 sm:flex sm:flex-row-reverse">
                        <button
                          type="submit"
                          className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-indigo-600 text-base font-medium text-white hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:ml-3 sm:w-auto sm:text-sm"
                        >
                          Create Webhook
                        </button>
                        <button
                          type="button"
                          className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:mt-0 sm:w-auto sm:text-sm"
                          onClick={() => setShowCreateModal(false)}
                        >
                          Cancel
                        </button>
                      </div>
                    </form>
                  </div>
                </div>
              </div>
              <div className="absolute top-0 right-0 pt-4 pr-4">
                <button
                  type="button"
                  className="bg-white rounded-md text-gray-400 hover:text-gray-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                  onClick={() => setShowCreateModal(false)}
                >
                  <span className="sr-only">Close</span>
                  <X className="h-6 w-6" />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* Edit Webhook Modal */}
      {showEditModal && (
        <div className="fixed inset-0 z-10 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" aria-hidden="true"></div>
            <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>
            <div className="inline-block align-bottom bg-white rounded-lg px-4 pt-5 pb-4 text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full sm:p-6">
              <div className="sm:flex sm:items-start">
                <div className="mx-auto flex-shrink-0 flex items-center justify-center h-12 w-12 rounded-full bg-indigo-100 sm:mx-0 sm:h-10 sm:w-10">
                  <Edit className="h-6 w-6 text-indigo-600" />
                </div>
                <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left w-full">
                  <h3 className="text-lg leading-6 font-medium text-gray-900">Edit Webhook</h3>
                  <div className="mt-2">
                    <form onSubmit={handleEditSubmit} className="space-y-4">
                      <div>
                        <label htmlFor="edit-userId" className="block text-sm font-medium text-gray-700">
                          User
                        </label>
                        <input
                          type="text"
                          id="edit-userId"
                          value={userMap[formState.userId] || formState.userId}
                          disabled
                          className="mt-1 block w-full py-2 px-3 border border-gray-300 bg-gray-100 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                        />
                      </div>
                      
                      <div>
                        <label htmlFor="edit-platform" className="block text-sm font-medium text-gray-700">
                          Platform <span className="text-red-500">*</span>
                        </label>
                        <select
                          id="edit-platform"
                          name="platform"
                          value={formState.platform}
                          onChange={handleFormChange}
                          required
                          className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md"
                        >
                          <option value="facebook">Facebook</option>
                          <option value="instagram">Instagram</option>
                          <option value="whatsapp">WhatsApp</option>
                          <option value="all">All Platforms</option>
                        </select>
                      </div>
                      
                      <div>
                        <label htmlFor="edit-webhookName" className="block text-sm font-medium text-gray-700">
                          Webhook Name
                        </label>
                        <input
                          type="text"
                          id="edit-webhookName"
                          name="webhookName"
                          value={formState.webhookName}
                          onChange={handleFormChange}
                          placeholder="E.g., Primary Facebook Webhook"
                          className="mt-1 focus:ring-indigo-500 focus:border-indigo-500 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md"
                        />
                      </div>
                      
                      <div>
                        <label htmlFor="edit-channelName" className="block text-sm font-medium text-gray-700">
                          Channel Name <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="text"
                          id="edit-channelName"
                          name="channelName"
                          value={formState.channelName}
                          onChange={handleFormChange}
                          required
                          placeholder="E.g., main-page, support-channel"
                          className="mt-1 focus:ring-indigo-500 focus:border-indigo-500 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md"
                        />
                      </div>
                      
                      <div>
                        <label htmlFor="edit-channelId" className="block text-sm font-medium text-gray-700">
                          Channel ID
                        </label>
                        <input
                          type="text"
                          id="edit-channelId"
                          name="channelId"
                          value={formState.channelId}
                          onChange={handleFormChange}
                          placeholder="E.g., page123456789"
                          className="mt-1 focus:ring-indigo-500 focus:border-indigo-500 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md"
                        />
                      </div>
                      
                      <div>
                        <label htmlFor="edit-webhookUrl" className="block text-sm font-medium text-gray-700">
                          Custom Webhook URL
                        </label>
                        <input
                          type="text"
                          id="edit-webhookUrl"
                          name="webhookUrl"
                          value={formState.webhookUrl}
                          onChange={handleFormChange}
                          placeholder="https://example.com/webhook-endpoint"
                          className="mt-1 focus:ring-indigo-500 focus:border-indigo-500 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md"
                        />
                      </div>
                      
                      <div>
                        <label htmlFor="edit-verificationToken" className="block text-sm font-medium text-gray-700">
                          Verification Token
                        </label>
                        <input
                          type="text"
                          id="edit-verificationToken"
                          name="verificationToken"
                          value={formState.verificationToken}
                          onChange={handleFormChange}
                          placeholder="Custom verification token"
                          className="mt-1 focus:ring-indigo-500 focus:border-indigo-500 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md"
                        />
                      </div>
                      
                      <div className="flex items-center">
                        <input
                          id="edit-isActive"
                          name="isActive"
                          type="checkbox"
                          checked={formState.isActive}
                          onChange={handleFormChange}
                          className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                        />
                        <label htmlFor="edit-isActive" className="ml-2 block text-sm text-gray-900">
                          Active
                        </label>
                      </div>
                      
                      <div className="mt-5 sm:mt-4 sm:flex sm:flex-row-reverse">
                        <button
                          type="submit"
                          className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-indigo-600 text-base font-medium text-white hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:ml-3 sm:w-auto sm:text-sm"
                        >
                          Update Webhook
                        </button>
                        <button
                          type="button"
                          className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:mt-0 sm:w-auto sm:text-sm"
                          onClick={() => setShowEditModal(false)}
                        >
                          Cancel
                        </button>
                      </div>
                    </form>
                  </div>
                </div>
              </div>
              <div className="absolute top-0 right-0 pt-4 pr-4">
                <button
                  type="button"
                  className="bg-white rounded-md text-gray-400 hover:text-gray-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                  onClick={() => setShowEditModal(false)}
                >
                  <span className="sr-only">Close</span>
                  <X className="h-6 w-6" />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && selectedWebhook && (
        <div className="fixed inset-0 z-10 overflow-y-auto">
          <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" aria-hidden="true"></div>
            <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>
            <div className="inline-block align-bottom bg-white rounded-lg px-4 pt-5 pb-4 text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full sm:p-6">
              <div className="sm:flex sm:items-start">
                <div className="mx-auto flex-shrink-0 flex items-center justify-center h-12 w-12 rounded-full bg-red-100 sm:mx-0 sm:h-10 sm:w-10">
                  <Trash2 className="h-6 w-6 text-red-600" aria-hidden="true" />
                </div>
                <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left">
                  <h3 className="text-lg leading-6 font-medium text-gray-900">Delete Webhook</h3>
                  <div className="mt-2">
                    <p className="text-sm text-gray-500">
                      Are you sure you want to delete this webhook configuration?
                      This action cannot be undone.
                    </p>
                    <div className="mt-4 p-4 bg-gray-50 rounded-md">
                      <p className="text-sm text-gray-700">
                        <strong>User:</strong> {userMap[selectedWebhook.user_id || ''] || selectedWebhook.user_id}
                      </p>
                      <p className="text-sm text-gray-700">
                        <strong>Platform:</strong> {selectedWebhook.platform || 'All'}
                      </p>
                      {selectedWebhook.channel_name && (
                        <p className="text-sm text-gray-700">
                          <strong>Channel:</strong> {selectedWebhook.channel_name}
                        </p>
                      )}
                      {selectedWebhook.webhook_name && (
                        <p className="text-sm text-gray-700">
                          <strong>Name:</strong> {selectedWebhook.webhook_name}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              </div>
              <div className="mt-5 sm:mt-4 sm:flex sm:flex-row-reverse">
                <button
                  type="button"
                  className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-red-600 text-base font-medium text-white hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 sm:ml-3 sm:w-auto sm:text-sm"
                  onClick={handleDelete}
                >
                  Delete
                </button>
                <button
                  type="button"
                  className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:mt-0 sm:w-auto sm:text-sm"
                  onClick={() => setShowDeleteConfirm(false)}
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}