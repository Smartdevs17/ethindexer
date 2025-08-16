"use client";

import React, { useState } from 'react';
import { Play, Sparkles, Zap, MessageSquare, CheckCircle, ArrowRight, Wallet } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useAccount } from 'wagmi';
import { useEthIndexer } from '../../../hooks/ethindexer/useEthIndexer';
import { ChatInterface } from '../../../components/ethindexer/chat/ChatInterface';
import { RainbowKitCustomConnectButton } from '../../../components/scaffold-eth';

export default function QueryBuilderPage() {
  const [queryInput, setQueryInput] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [createdAPI, setCreatedAPI] = useState<any>(null);
  const [activeInterface, setActiveInterface] = useState<'simple' | 'chat'>('simple');
  
  const { isConnected } = useAccount();
  const { createJob, isAuthenticated } = useEthIndexer();
  const router = useRouter();

  const handleCreateAPI = async (query?: string) => {
    const finalQuery = query || queryInput;
    if (!finalQuery.trim()) return;
    
    // Check if wallet is connected and user is authenticated
    if (!isConnected) {
      alert('Please connect your wallet first to create indexing jobs.');
      return;
    }
    
    if (!isAuthenticated) {
      alert('Please wait for authentication to complete before creating jobs.');
      return;
    }
    
    setIsCreating(true);
    setShowSuccess(false);
    
    try {
      const result = await createJob(finalQuery);
      
      // Show success state
      setCreatedAPI({
        query: finalQuery,
        jobId: result.result?.jobId || result.jobId || 'Processing...'
      });
      setShowSuccess(true);
      setQueryInput('');
      
      // Auto-redirect to APIs page after 3 seconds
      setTimeout(() => {
        router.push('/app/apis');
      }, 3000);
      
    } catch (error) {
      console.error('Failed to create API:', error);
      alert('Failed to create API. Please try again.');
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

  // Show wallet connection requirement if not connected
  if (!isConnected) {
    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">Create Your API</h2>
          <p className="text-gray-600 dark:text-gray-300">Connect your wallet to start indexing blockchain data</p>
        </div>
        
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-8 text-center">
          <Wallet className="h-16 w-16 text-gray-400 dark:text-gray-500 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">Wallet Connection Required</h3>
          <p className="text-gray-600 dark:text-gray-300 mb-6">
            Connect your wallet to create personalized indexing jobs and track your blockchain data.
          </p>
          <RainbowKitCustomConnectButton />
        </div>
      </div>
    );
  }

  // Show authentication loading if connected but not authenticated
  if (isConnected && !isAuthenticated) {
    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">Create Your API</h2>
          <p className="text-gray-600 dark:text-gray-300">Setting up your account...</p>
        </div>
        
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-8 text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">Authenticating...</h3>
          <p className="text-gray-600 dark:text-gray-300">
            Please wait while we set up your account and prepare your indexing environment.
          </p>
        </div>
      </div>
    );
  }

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
      query: "Index USDC transfers from recent blocks",
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

  // Success State
  if (showSuccess && createdAPI) {
    return (
      <div className="space-y-6">
        <div className="text-center">
          <div className="mb-6">
            <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
            <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">API Created Successfully!</h2>
            <p className="text-gray-600 dark:text-gray-400">Your blockchain data endpoint is being generated</p>
          </div>
          
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 p-8 max-w-2xl mx-auto">
            <div className="space-y-4">
              <div className="flex items-center justify-center gap-3">
                <div className="animate-spin h-6 w-6 border-2 border-blue-600 border-t-transparent rounded-full"></div>
                <span className="text-lg font-medium text-gray-900 dark:text-white">Processing your request...</span>
              </div>
              
              <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4">
                <h3 className="font-medium text-blue-900 dark:text-blue-300 mb-2">Your Query:</h3>
                <p className="text-blue-800 dark:text-blue-400">"{createdAPI.query}"</p>
              </div>
              
              <div className="text-sm text-gray-600 dark:text-gray-400 space-y-2">
                <p>✅ Query parsed by AI</p>
                <p>🔄 Indexing blockchain data</p>
                <p>⏳ Generating your API endpoint</p>
              </div>
              
              <div className="pt-4 space-y-3">
                <button
                  onClick={() => router.push('/app/apis')}
                  className="w-full flex items-center justify-center gap-2 bg-blue-600 text-white px-6 py-3 rounded-xl hover:bg-blue-700 transition-colors"
                >
                  View Your APIs
                  <ArrowRight className="h-4 w-4" />
                </button>
                
                <button
                  onClick={() => {
                    setShowSuccess(false);
                    setCreatedAPI(null);
                  }}
                  className="w-full text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200"
                >
                  Create Another API
                </button>
              </div>
            </div>
          </div>
          
          <div className="text-sm text-gray-500 dark:text-gray-400 mt-4">
            Redirecting to your APIs in <span className="font-mono">3</span> seconds...
          </div>
        </div>
      </div>
    );
  }

  // Main Interface
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center">
        <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">Create Your API</h2>
        <p className="text-gray-600 dark:text-gray-400">Describe what blockchain data you want to track in plain English</p>
      </div>

      {/* Interface Toggle */}
      <div className="flex justify-center">
        <div className="bg-white dark:bg-gray-800 rounded-lg p-1 shadow-sm border border-gray-200 dark:border-gray-700">
          <button
            onClick={() => setActiveInterface('simple')}
            className={`px-6 py-2 rounded-md text-sm font-medium transition-colors ${
              activeInterface === 'simple'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
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
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
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
                  className="w-full px-4 py-4 text-lg border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400"
                  rows={3}
                  disabled={isCreating}
                />
                <button
                  onClick={() => handleCreateAPI()}
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
                    disabled={isCreating}
                  >
                    <div className="flex items-start space-x-3">
                      <span className="text-2xl">{action.icon}</span>
                      <div>
                        <h3 className="font-medium text-gray-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400">
                          {action.title}
                        </h3>
                        <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">{action.description}</p>
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
                    disabled={isCreating}
                    className="px-3 py-2 text-sm bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-900/50 transition-colors border border-blue-200 dark:border-blue-700 disabled:opacity-50"
                  >
                    {example}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 h-[600px]">
          <ChatInterface
            onExecuteQuery={handleCreateAPI}
            isProcessing={isCreating}
            systemStatus="Ready"
          />
        </div>
      )}

      {/* Info Section */}
      <div className="bg-blue-50 dark:bg-blue-900/20 rounded-xl p-6 border border-blue-200 dark:border-blue-700">
        <h3 className="text-lg font-semibold text-blue-900 dark:text-blue-300 mb-2">How it works</h3>
        <div className="grid md:grid-cols-3 gap-4 text-sm">
          <div className="flex items-start space-x-3">
            <div className="w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-xs font-bold">1</div>
            <div>
              <p className="font-medium text-blue-900 dark:text-blue-300">Describe your data</p>
              <p className="text-blue-700 dark:text-blue-400">Tell us what blockchain data you want to track</p>
            </div>
          </div>
          <div className="flex items-start space-x-3">
            <div className="w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-xs font-bold">2</div>
            <div>
              <p className="font-medium text-blue-900 dark:text-blue-300">AI generates your API</p>
              <p className="text-blue-700 dark:text-blue-400">Our AI creates a custom endpoint for your data</p>
            </div>
          </div>
          <div className="flex items-start space-x-3">
            <div className="w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-xs font-bold">3</div>
            <div>
              <p className="font-medium text-blue-900 dark:text-blue-300">Use your API</p>
              <p className="text-blue-700 dark:text-blue-400">Copy the URL and start getting live blockchain data</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}