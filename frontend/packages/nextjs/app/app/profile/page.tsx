"use client";

import React, { useState } from 'react';
import { User, Wallet, Settings, Plus, Edit2 } from 'lucide-react';

export default function ProfilePage() {
  const [addresses, setAddresses] = useState([
    {
      id: '1',
      name: 'Main Wallet',
      address: '0x742d35cc44b75c42b4b6c5a8b964b08d2a6f6c42',
      isConnected: true
    }
  ]);

  const [newAddressName, setNewAddressName] = useState('');
  const [newAddress, setNewAddress] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);

  const addAddress = () => {
    if (newAddressName.trim() && newAddress.trim()) {
      setAddresses([...addresses, {
        id: Date.now().toString(),
        name: newAddressName.trim(),
        address: newAddress.trim(),
        isConnected: false
      }]);
      setNewAddressName('');
      setNewAddress('');
      setShowAddForm(false);
    }
  };

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
          <div>
            <p className="font-mono text-sm text-gray-800 dark:text-gray-200">0x742d35cc44b75c42b4b6c5a8b964b08d2a6f6c42</p>
            <p className="text-sm text-green-700 dark:text-green-300 mt-1">✓ Connected via MetaMask</p>
          </div>
          <button className="px-4 py-2 text-sm bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 rounded-lg hover:bg-red-200 dark:hover:bg-red-900/50 transition-colors">
            Disconnect
          </button>
        </div>
      </div>
      
      {/* Address Book */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <User className="h-6 w-6 text-blue-600" />
            <h3 className="text-xl font-semibold text-gray-900 dark:text-white">My Addresses</h3>
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
                onClick={addAddress}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm"
              >
                Add Address
              </button>
              <button
                onClick={() => setShowAddForm(false)}
                className="px-4 py-2 bg-gray-300 dark:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-400 dark:hover:bg-gray-500 text-sm"
              >
                Cancel
              </button>
            </div>
          </div>
        )}
        
        {/* Address List */}
        <div className="space-y-3">
          {addresses.map((addr) => (
            <div key={addr.id} className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <h4 className="font-medium text-gray-900 dark:text-white">{addr.name}</h4>
                  {addr.isConnected && (
                    <span className="px-2 py-1 bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300 text-xs rounded-full">
                      Connected
                    </span>
                  )}
                </div>
                <p className="font-mono text-sm text-gray-600 dark:text-gray-300">{addr.address}</p>
              </div>
              <div className="flex gap-2">
                <button className="p-2 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200">
                  <Edit2 className="h-4 w-4" />
                </button>
                <button 
                  onClick={() => setAddresses(addresses.filter(a => a.id !== addr.id))}
                  className="p-2 text-red-500 hover:text-red-700"
                >
                  ×
                </button>
              </div>
            </div>
          ))}
        </div>
        
        {/* Usage Examples */}
        <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
          <h4 className="font-medium text-blue-900 dark:text-blue-100 mb-2">💡 How to use saved addresses</h4>
          <div className="text-sm text-blue-800 dark:text-blue-200 space-y-1">
            <p>• "Index transfers to my Main Wallet"</p>
            <p>• "Track large transactions from my Trading Wallet"</p>
            <p>• "Show me DeFi interactions for my addresses"</p>
          </div>
        </div>
      </div>
      
      {/* Settings */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-6">
        <div className="flex items-center gap-3 mb-4">
          <Settings className="h-6 w-6 text-blue-600" />
          <h3 className="text-xl font-semibold text-gray-900 dark:text-white">Preferences</h3>
        </div>
        
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="font-medium text-gray-900 dark:text-white">Email Notifications</h4>
              <p className="text-sm text-gray-600 dark:text-gray-300">Get notified when your APIs are ready</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input type="checkbox" defaultChecked className="sr-only peer" />
              <div className="w-11 h-6 bg-gray-200 dark:bg-gray-700 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
            </label>
          </div>
          
          <div className="flex items-center justify-between">
            <div>
              <h4 className="font-medium text-gray-900 dark:text-white">Auto-refresh Data</h4>
              <p className="text-sm text-gray-600 dark:text-gray-300">Automatically update live data every 30 seconds</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input type="checkbox" defaultChecked className="sr-only peer" />
              <div className="w-11 h-6 bg-gray-200 dark:bg-gray-700 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
            </label>
          </div>
          
          <div className="flex items-center justify-between">
            <div>
              <h4 className="font-medium text-gray-900 dark:text-white">Debug Mode</h4>
              <p className="text-sm text-gray-600 dark:text-gray-300">Show technical information and logs</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input type="checkbox" className="sr-only peer" />
              <div className="w-11 h-6 bg-gray-200 dark:bg-gray-700 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
            </label>
          </div>
        </div>
      </div>
      
      {/* Account Info */}
      <div className="bg-gray-50 dark:bg-gray-700 rounded-2xl border border-gray-200 dark:border-gray-600 p-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Account Information</h3>
        <div className="grid md:grid-cols-2 gap-4 text-sm">
          <div>
            <span className="text-gray-600 dark:text-gray-300">Account Type:</span>
            <span className="ml-2 font-medium text-gray-900 dark:text-white">Free Tier</span>
          </div>
          <div>
            <span className="text-gray-600 dark:text-gray-300">APIs Created:</span>
            <span className="ml-2 font-medium text-gray-900 dark:text-white">3 / 10</span>
          </div>
          <div>
            <span className="text-gray-600 dark:text-gray-300">Data Usage:</span>
            <span className="ml-2 font-medium text-gray-900 dark:text-white">2.1GB / 5GB</span>
          </div>
          <div>
            <span className="text-gray-600 dark:text-gray-300">Member Since:</span>
            <span className="ml-2 font-medium text-gray-900 dark:text-white">August 2024</span>
          </div>
        </div>
      </div>
    </div>
  );
}