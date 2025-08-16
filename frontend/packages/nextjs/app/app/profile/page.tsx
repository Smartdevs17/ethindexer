"use client";

import React, { useState, useEffect } from 'react';
import { User, Wallet, Settings, Plus, Edit2, Copy, Check, Trash2, Database, Activity, Shield } from 'lucide-react';
import { useAccount, useBalance, useDisconnect } from 'wagmi';
import { useEthIndexer } from '../../../hooks/ethindexer/useEthIndexer';

export default function ProfilePage() {
  const { address, isConnected, chain } = useAccount();
  const { data: balance } = useBalance({ address });
  const { disconnect } = useDisconnect();
  const { 
    user, 
    isAuthenticated, 
    addUserAddress, 
    removeUserAddress, 
    refreshUserData,
    jobs, 
    transfers 
  } = useEthIndexer();

  // Local state
  const [newAddressName, setNewAddressName] = useState('');
  const [newAddress, setNewAddress] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);
  const [copiedAddress, setCopiedAddress] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleAddAddress = async () => {
    if (newAddressName.trim() && newAddress.trim()) {
      setIsLoading(true);
      try {
        await addUserAddress(newAddressName.trim(), newAddress.trim());
        setNewAddressName('');
        setNewAddress('');
        setShowAddForm(false);
      } catch (error) {
        console.error('Failed to add address:', error);
      } finally {
        setIsLoading(false);
      }
    }
  };

  const handleRemoveAddress = async (addressId: string) => {
    try {
      await removeUserAddress(addressId);
    } catch (error) {
      console.error('Failed to remove address:', error);
    }
  };

  const copyAddress = async (address: string) => {
    try {
      await navigator.clipboard.writeText(address);
      setCopiedAddress(address);
      setTimeout(() => setCopiedAddress(null), 2000);
    } catch (err) {
      console.error('Failed to copy address:', err);
    }
  };

  const formatBalance = (balance: any) => {
    if (!balance) return '0 ETH';
    return `${parseFloat(balance.formatted).toFixed(4)} ${balance.symbol}`;
  };

  const getUserStats = () => {
    if (!user?.stats) {
      const userJobs = jobs.filter(job => job.jobId && !job.jobId.startsWith('cache-'));
      const completedJobs = userJobs.filter(job => job.status === 'completed');
      const activeJobs = userJobs.filter(job => job.status === 'active' || job.status === 'processing');
      
      return {
        totalJobs: userJobs.length,
        completedJobs: completedJobs.length,
        activeJobs: activeJobs.length,
        savedAddresses: user?.addresses?.length || 0
      };
    }
    
    return user.stats;
  };

  const stats = getUserStats();

  if (!isConnected) {
    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">Profile & Settings</h2>
          <p className="text-gray-600 dark:text-gray-300">Connect your wallet to manage your account</p>
        </div>
        
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-8 text-center">
          <Wallet className="h-16 w-16 text-gray-400 dark:text-gray-500 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">Wallet Not Connected</h3>
          <p className="text-gray-600 dark:text-gray-300 mb-6">
            Connect your wallet to access your profile, manage saved addresses, and view your indexing statistics.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">Profile & Settings</h2>
        <p className="text-gray-600 dark:text-gray-300">Manage your wallet connections and preferences</p>
      </div>
      
      {/* Connected Wallet */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-6">
        <div className="flex items-center gap-3 mb-4">
          <Wallet className="h-6 w-6 text-blue-600" />
          <h3 className="text-xl font-semibold text-gray-900 dark:text-white">Connected Wallet</h3>
        </div>
        
        <div className="flex items-center justify-between p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2">
              <p className="font-mono text-sm text-gray-800 dark:text-gray-200">{address}</p>
              <button
                onClick={() => copyAddress(address!)}
                className="p-1 hover:bg-gray-200 dark:hover:bg-gray-600 rounded"
              >
                {copiedAddress === address ? (
                  <Check className="h-4 w-4 text-green-600" />
                ) : (
                  <Copy className="h-4 w-4 text-gray-500" />
                )}
              </button>
            </div>
            <div className="flex items-center gap-4 text-sm">
              <span className="text-green-700 dark:text-green-300">✓ Connected via {chain?.name || 'Unknown'}</span>
              <span className="text-gray-600 dark:text-gray-400">{formatBalance(balance)}</span>
              {isAuthenticated && (
                <span className="text-blue-700 dark:text-blue-300">✓ Authenticated</span>
              )}
            </div>
          </div>
          <button 
            onClick={() => disconnect()}
            className="px-4 py-2 text-sm bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 rounded-lg hover:bg-red-200 dark:hover:bg-red-900/50 transition-colors"
          >
            Disconnect
          </button>
        </div>
      </div>

      {/* User Statistics */}
      <div className="grid lg:grid-cols-4 gap-6">
        <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between mb-2">
            <h3 className="font-semibold text-gray-900 dark:text-white">Total Jobs</h3>
            <Database className="h-5 w-5 text-blue-600" />
          </div>
          <p className="text-3xl font-bold text-blue-600 mb-1">{stats.totalJobs}</p>
          <p className="text-sm text-gray-500 dark:text-gray-400">Created</p>
        </div>
        
        <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between mb-2">
            <h3 className="font-semibold text-gray-900 dark:text-white">Completed</h3>
            <Check className="h-5 w-5 text-green-600" />
          </div>
          <p className="text-3xl font-bold text-green-600 mb-1">{stats.completedJobs}</p>
          <p className="text-sm text-gray-500 dark:text-gray-400">Successful</p>
        </div>
        
        <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between mb-2">
            <h3 className="font-semibold text-gray-900 dark:text-white">Active</h3>
            <Activity className="h-5 w-5 text-yellow-600" />
          </div>
          <p className="text-3xl font-bold text-yellow-600 mb-1">{stats.activeJobs}</p>
          <p className="text-sm text-gray-500 dark:text-gray-400">Processing</p>
        </div>
        
        <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between mb-2">
            <h3 className="font-semibold text-gray-900 dark:text-white">Saved Addresses</h3>
            <Shield className="h-5 w-5 text-purple-600" />
          </div>
          <p className="text-3xl font-bold text-purple-600 mb-1">{stats.savedAddresses}</p>
          <p className="text-sm text-gray-500 dark:text-gray-400">Tracked</p>
        </div>
      </div>
      
      {/* Address Book */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <User className="h-6 w-6 text-blue-600" />
            <h3 className="text-xl font-semibold text-gray-900 dark:text-white">Saved Addresses</h3>
          </div>
          <button
            onClick={() => setShowAddForm(!showAddForm)}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Plus className="h-4 w-4" />
            Add Address
          </button>
        </div>
        
        <p className="text-gray-600 dark:text-gray-300 mb-4">Track specific addresses with custom names for easier querying</p>
        
        {/* Add Address Form */}
        {showAddForm && (
          <div className="mb-6 p-4 bg-gray-50 dark:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-600">
            <h4 className="font-medium text-gray-900 dark:text-white mb-3">Add New Address</h4>
            <div className="grid md:grid-cols-2 gap-3">
              <input
                type="text"
                placeholder="Address name (e.g., Trading Wallet)"
                value={newAddressName}
                onChange={(e) => setNewAddressName(e.target.value)}
                className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-600 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400"
              />
              <input
                type="text"
                placeholder="0x..."
                value={newAddress}
                onChange={(e) => setNewAddress(e.target.value)}
                className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-600 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400"
              />
            </div>
            <div className="flex gap-2 mt-3">
              <button
                onClick={handleAddAddress}
                disabled={isLoading}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm disabled:opacity-50"
              >
                {isLoading ? 'Adding...' : 'Add Address'}
              </button>
              <button
                onClick={() => setShowAddForm(false)}
                className="px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 text-sm"
              >
                Cancel
              </button>
            </div>
          </div>
        )}
        
        {/* Address List */}
        <div className="space-y-3">
          {!user?.addresses || user.addresses.length === 0 ? (
            <div className="text-center py-8 text-gray-500 dark:text-gray-400">
              <User className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No saved addresses yet</p>
              <p className="text-sm">Add addresses to track them in your queries</p>
            </div>
          ) : (
            user.addresses.map((savedAddress) => (
              <div key={savedAddress.id} className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-1">
                    <span className="font-medium text-gray-900 dark:text-white">{savedAddress.name}</span>
                    {savedAddress.address.toLowerCase() === address?.toLowerCase() && (
                      <span className="px-2 py-1 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 text-xs rounded-full">
                        Connected
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <p className="font-mono text-sm text-gray-600 dark:text-gray-400">{savedAddress.address}</p>
                    <button
                      onClick={() => copyAddress(savedAddress.address)}
                      className="p-1 hover:bg-gray-200 dark:hover:bg-gray-600 rounded"
                    >
                      {copiedAddress === savedAddress.address ? (
                        <Check className="h-3 w-3 text-green-600" />
                      ) : (
                        <Copy className="h-3 w-3 text-gray-500" />
                      )}
                    </button>
                  </div>
                </div>
                <button
                  onClick={() => handleRemoveAddress(savedAddress.id)}
                  className="p-2 text-red-500 hover:bg-red-100 dark:hover:bg-red-900/30 rounded-lg transition-colors"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}