"use client";

import React, { useState } from 'react';
import { Play, Sparkles, Zap, MessageSquare } from 'lucide-react';
import { useEthIndexer } from '../../../hooks/ethindexer/useEthIndexer';

export default function QueryBuilderPage() {
  const [queryInput, setQueryInput] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [activeInterface, setActiveInterface] = useState<'simple' | 'chat'>('simple');
  
  const { createJob } = useEthIndexer();

  const handleCreateAPI = async () => {
    if (!queryInput.trim()) return;
    
    setIsCreating(true);
    try {
      await createJob(queryInput);
      setQueryInput('');
      // Show success message or redirect to APIs page
    } catch (error) {
      console.error('Failed to create API:', error);
      // Show error message
    } finally {
      setIsCreating(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleCreateAPI();
    }
  };

  const exampleQueries = [
    "Index USDC transfers from the last 1000 blocks",
    "Track my wallet's transactions",
    "Index WETH transfers above $10,000",
    "Monitor DeFi token swaps",
    "Track NFT marketplace activity",
    "Index transfers for 0xA0b86a33E6441E...",
    "Show me large transactions (>$50k)",
    "Index transfers from block 18000000 to 18100000"
  ];

  const quickActions = [
    {
      title: "Track My Wallet",
      description: "Monitor all transactions to/from your connected wallet",
      query: "Index all transfers to my wallet address",
      icon: "👛"
    },
    {
      title: "Popular Tokens",
      description: "Index transfers for USDC, WETH, and other major tokens",
      query: "Index USDC and WETH transfers from recent blocks",
      icon: "🏆"
    },
    {
      title: "Large Transfers",
      description: "Track high-value transactions across all tokens",
      query: "Index transfers above $100,000 in value",
      icon: "💰"
    },
    {
      title: "DeFi Activity",
      description: "Monitor decentralized exchange and lending protocol activity",
      query: "Index DeFi protocol interactions and token swaps",
      icon: "🔄"
    }
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center">
        <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">Create Your API</h2>
        <p className="text-gray-600 dark:text-gray-300">Describe what blockchain data you want to track in plain English</p>
      </div>

      {/* Interface Toggle */}
      <div className="flex justify-center">
        <div className="bg-white dark:bg-gray-800 rounded-lg p-1 shadow-sm border border-gray-200 dark:border-gray-700">
          <button
            onClick={() => setActiveInterface('simple')}
            className={`px-6 py-2 rounded-md text-sm font-medium transition-colors ${
              activeInterface === 'simple'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white'
            }`}
          >
            <Sparkles className="inline h-4 w-4 mr-2" />
            Simple Input
          </button>
          <button
            onClick={() => setActiveInterface('chat')}
            className={`px-6 py-2 rounded-md text-sm font-medium transition-colors ${
              activeInterface === 'chat'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white'
            }`}
          >
            <MessageSquare className="inline h-4 w-4 mr-2" />
            Chat Interface
          </button>
        </div>
      </div>
      
      {activeInterface === 'simple' ? (
        /* Simple Interface */
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 p-8">
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                What blockchain data do you want to index?
              </label>
              <div className="relative">
                <textarea
                  value={queryInput}
                  onChange={(e) => setQueryInput(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder="e.g., Index USDC transfers from the last 1000 blocks"
                  className="w-full px-4 py-4 text-lg text-gray-900 dark:text-white bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none placeholder-gray-500 dark:placeholder-gray-400"
                  rows={3}
                  disabled={isCreating}
                />
                <button
                  onClick={handleCreateAPI}
                  disabled={isCreating || !queryInput.trim()}
                  className="absolute bottom-3 right-3 bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 transition-colors"
                >
                  {isCreating ? (
                    <>
                      <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full" />
                      Creating...
                    </>
                  ) : (
                    <>
                      <Play className="h-4 w-4" />
                      Generate API
                    </>
                  )}
                </button>
              </div>
            </div>
            
            {/* Quick Actions */}
            <div>
              <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-4">Quick Actions:</p>
              <div className="grid md:grid-cols-2 gap-4">
                {quickActions.map((action, index) => (
                  <button
                    key={index}
                    onClick={() => setQueryInput(action.query)}
                    className="text-left p-4 bg-gray-50 dark:bg-gray-700 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors border border-gray-200 dark:border-gray-600 group"
                  >
                    <div className="flex items-start space-x-3">
                      <span className="text-2xl">{action.icon}</span>
                      <div>
                        <h3 className="font-medium text-gray-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400">
                          {action.title}
                        </h3>
                        <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">{action.description}</p>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
            
            {/* Example Queries */}
            <div>
              <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">Example Queries:</p>
              <div className="flex flex-wrap gap-2">
                {exampleQueries.map((example, index) => (
                  <button
                    key={index}
                    onClick={() => setQueryInput(example)}
                    className="px-3 py-2 text-sm bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-900/50 transition-colors border border-blue-200 dark:border-blue-700"
                  >
                    {example}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* Chat Interface */
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 h-[600px]">
          <div className="p-6 border-b border-gray-200 dark:border-gray-700">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center">
              <Zap className="h-5 w-5 text-blue-600 mr-2" />
              AI Assistant
            </h3>
            <p className="text-gray-600 dark:text-gray-300 text-sm">Have a conversation to build your perfect API</p>
          </div>
          
          <div className="p-6 h-full flex items-center justify-center text-gray-500 dark:text-gray-400">
            <div className="text-center">
              <MessageSquare className="h-12 w-12 mx-auto mb-4 text-gray-400 dark:text-gray-500" />
              <p>Chat interface coming soon...</p>
              <p className="text-sm mt-2">Use the Simple Input above for now</p>
            </div>
          </div>
        </div>
      )}

      {/* Info Section */}
      <div className="bg-blue-50 dark:bg-blue-900/20 rounded-xl p-6 border border-blue-200 dark:border-blue-800">
        <h3 className="text-lg font-semibold text-blue-900 dark:text-blue-100 mb-2">How it works</h3>
        <div className="grid md:grid-cols-3 gap-4 text-sm">
          <div className="flex items-start space-x-3">
            <div className="w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-xs font-bold">1</div>
            <div>
              <p className="font-medium text-blue-900 dark:text-blue-100">Describe your data</p>
              <p className="text-blue-700 dark:text-blue-300">Tell us what blockchain data you want to track</p>
            </div>
          </div>
          <div className="flex items-start space-x-3">
            <div className="w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-xs font-bold">2</div>
            <div>
              <p className="font-medium text-blue-900 dark:text-blue-100">AI generates your API</p>
              <p className="text-blue-700 dark:text-blue-300">Our AI creates a custom endpoint for your data</p>
            </div>
          </div>
          <div className="flex items-start space-x-3">
            <div className="w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-xs font-bold">3</div>
            <div>
              <p className="font-medium text-blue-900 dark:text-blue-100">Use your API</p>
              <p className="text-blue-700 dark:text-blue-300">Copy the URL and start getting live blockchain data</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}