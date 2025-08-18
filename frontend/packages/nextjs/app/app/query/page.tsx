"use client";

import React, { useState } from 'react';
import { Play, Sparkles, CheckCircle, ArrowRight, Wallet, Bot, MessageSquare, Database, Zap, Hash, TrendingUp, Globe } from 'lucide-react';
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
        <div className="text-center">
          <div className="w-20 h-20 bg-gradient-to-r from-blue-600 to-purple-600 rounded-full flex items-center justify-center mx-auto mb-6">
            <Wallet className="h-10 w-10 text-white" />
          </div>
          <h2 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">Connect Your Wallet</h2>
          <p className="text-xl text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
            Start creating personalized blockchain data APIs by connecting your wallet
          </p>
        </div>
        
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-8 text-center max-w-md mx-auto">
          <RainbowKitCustomConnectButton />
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-4">
            Your wallet connection ensures secure, personalized indexing jobs
          </p>
        </div>
      </div>
    );
  }

  // Show authentication loading if connected but not authenticated
  if (isConnected && !isAuthenticated) {
    return (
      <div className="space-y-6">
        <div className="text-center">
          <div className="w-20 h-20 bg-gradient-to-r from-blue-600 to-purple-600 rounded-full flex items-center justify-center mx-auto mb-6">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white"></div>
          </div>
          <h2 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">Setting Up Your Account</h2>
          <p className="text-xl text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
            Please wait while we prepare your personalized indexing environment
          </p>
        </div>
        
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-8 text-center max-w-md mx-auto">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">Authenticating...</h3>
          <p className="text-gray-600 dark:text-gray-300">
            This will only take a moment
          </p>
        </div>
      </div>
    );
  }

  // Success State
  if (showSuccess && createdAPI) {
    return (
      <div className="space-y-6">
        <div className="text-center">
          <div className="mb-8">
            <div className="w-20 h-20 bg-gradient-to-r from-green-500 to-blue-500 rounded-full flex items-center justify-center mx-auto mb-6">
              <CheckCircle className="h-10 w-10 text-white" />
            </div>
            <h2 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">API Created Successfully!</h2>
            <p className="text-xl text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
              Your blockchain data endpoint is being generated and will be ready shortly
            </p>
          </div>
          
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg border border-gray-200 dark:border-gray-700 p-8 max-w-2xl mx-auto">
            <div className="space-y-6">
              <div className="flex items-center justify-center gap-3">
                <div className="animate-spin h-6 w-6 border-2 border-blue-600 border-t-transparent rounded-full"></div>
                <span className="text-lg font-medium text-gray-900 dark:text-white">Processing your request...</span>
              </div>
              
              <div className="bg-blue-50 dark:bg-blue-900/20 rounded-xl p-6">
                <h3 className="font-semibold text-blue-900 dark:text-blue-300 mb-3 text-lg">Your Query:</h3>
                <p className="text-blue-800 dark:text-blue-400 text-lg">"{createdAPI.query}"</p>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                <div className="flex items-center gap-2 text-green-600 dark:text-green-400">
                  <CheckCircle className="h-5 w-5" />
                  <span>Query parsed by AI</span>
                </div>
                <div className="flex items-center gap-2 text-blue-600 dark:text-blue-400">
                  <div className="animate-spin h-4 w-4 border-2 border-blue-600 border-t-transparent rounded-full"></div>
                  <span>Indexing blockchain data</span>
                </div>
                <div className="flex items-center gap-2 text-purple-600 dark:text-purple-400">
                  <Database className="h-5 w-5" />
                  <span>Generating API endpoint</span>
                </div>
              </div>
              
              <div className="pt-6 space-y-4">
                <button
                  onClick={() => router.push('/app/apis')}
                  className="w-full flex items-center justify-center gap-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white px-8 py-4 rounded-xl hover:from-blue-700 hover:to-purple-700 transition-all transform hover:scale-105 shadow-lg text-lg font-semibold"
                >
                  <Database className="h-5 w-5" />
                  View Your APIs
                  <ArrowRight className="h-5 w-5" />
                </button>
                
                <button
                  onClick={() => {
                    setShowSuccess(false);
                    setCreatedAPI(null);
                  }}
                  className="w-full text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 py-3"
                >
                  Create Another API
                </button>
              </div>
            </div>
          </div>
          
          <div className="text-sm text-gray-500 dark:text-gray-400 mt-6">
            Redirecting to your APIs in <span className="font-mono font-semibold">3</span> seconds...
          </div>
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
      icon: "👛",
      color: "from-blue-500 to-blue-600"
    },
    {
      title: "Popular Tokens",
      description: "Index transfers for USDC, WETH, and other major tokens",
      query: "Index USDC transfers from recent blocks",
      icon: "🏆",
      color: "from-purple-500 to-purple-600"
    },
    {
      title: "Large Transfers",
      description: "Track high-value transactions across all tokens",
      query: "Index transfers above $100,000 in value",
      icon: "💰",
      color: "from-green-500 to-green-600"
    },
    {
      title: "DeFi Activity",
      description: "Monitor decentralized exchange and lending protocol activity",
      query: "Index DeFi protocol interactions and token swaps",
      icon: "🔄",
      color: "from-orange-500 to-orange-600"
    }
  ];

  // Main Interface
  return (
    <div className="space-y-8 p-6">
      {/* Page Title */}
      <div className="text-center">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-3">
          Create Your Blockchain Data API
        </h1>
        <p className="text-lg text-gray-600 dark:text-gray-400 max-w-3xl mx-auto">
          Describe what blockchain data you want to track in plain English. 
          Our AI will create a custom API endpoint for you.
        </p>
      </div>

      {/* Interface Toggle */}
      <div className="flex justify-center">
        <div className="bg-white dark:bg-gray-800 rounded-xl p-1 shadow-lg border border-gray-200 dark:border-gray-700">
          <button
            onClick={() => setActiveInterface('simple')}
            className={`px-8 py-3 rounded-lg text-sm font-medium transition-all ${
              activeInterface === 'simple'
                ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-lg transform scale-105'
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
            }`}
          >
            <Sparkles className="inline h-4 w-4 mr-2" />
            Simple Input
          </button>
          <button
            onClick={() => setActiveInterface('chat')}
            className={`px-8 py-3 rounded-lg text-sm font-medium transition-all ${
              activeInterface === 'chat'
                ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-lg transform scale-105'
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
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl border border-gray-200 dark:border-gray-700 p-8">
          <div className="space-y-8">
            <div>
              <label className="block text-lg font-medium text-gray-700 dark:text-gray-300 mb-4">
                What blockchain data do you want to index?
              </label>
              <div className="relative">
                <textarea
                  value={queryInput}
                  onChange={(e) => setQueryInput(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder="e.g., Index USDC transfers from the last 1000 blocks"
                  className="w-full px-6 py-6 text-xl border border-gray-300 dark:border-gray-600 rounded-2xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 shadow-lg"
                  rows={3}
                  disabled={isCreating}
                />
                <button
                  onClick={() => handleCreateAPI()}
                  disabled={isCreating || !queryInput.trim()}
                  className="absolute bottom-4 right-4 bg-gradient-to-r from-blue-600 to-purple-600 text-white px-8 py-3 rounded-xl hover:from-blue-700 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-3 transition-all transform hover:scale-105 shadow-lg font-semibold"
                >
                  {isCreating ? (
                    <>
                      <div className="animate-spin h-5 w-5 border-2 border-white border-t-transparent rounded-full" />
                      Creating...
                    </>
                  ) : (
                    <>
                      <Play className="h-5 w-5" />
                      Generate API
                    </>
                  )}
                </button>
              </div>
            </div>
            
            {/* Quick Actions */}
            <div>
              <p className="text-lg font-medium text-gray-700 dark:text-gray-300 mb-6">Quick Actions:</p>
              <div className="grid md:grid-cols-2 gap-6">
                {quickActions.map((action, index) => (
                  <button
                    key={index}
                    onClick={() => setQueryInput(action.query)}
                    className="text-left p-6 bg-gray-50 dark:bg-gray-700 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-600 transition-all transform hover:scale-105 border border-gray-200 dark:border-gray-600 disabled:opacity-50 disabled:cursor-not-allowed group shadow-lg"
                    disabled={isCreating}
                  >
                    <div className="flex items-start space-x-4">
                      <div className={`w-12 h-12 bg-gradient-to-r ${action.color} rounded-xl flex items-center justify-center flex-shrink-0 text-2xl`}>
                        {action.icon}
                      </div>
                      <div>
                        <h3 className="text-xl font-semibold text-gray-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 mb-2">
                          {action.title}
                        </h3>
                        <p className="text-gray-600 dark:text-gray-400">{action.description}</p>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
            
            {/* Example Queries */}
            <div>
              <p className="text-lg font-medium text-gray-700 dark:text-gray-300 mb-4">Example Queries:</p>
              <div className="flex flex-wrap gap-3">
                {exampleQueries.map((example, index) => (
                  <button
                    key={index}
                    onClick={() => setQueryInput(example)}
                    disabled={isCreating}
                    className="px-4 py-3 text-sm bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-xl hover:bg-blue-100 dark:hover:bg-blue-900/50 transition-all border border-blue-200 dark:border-blue-700 disabled:opacity-50 hover:shadow-md"
                  >
                    {example}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl border border-gray-200 dark:border-gray-700 h-[700px]">
          <ChatInterface
            onExecuteQuery={handleCreateAPI}
            isProcessing={isCreating}
            systemStatus="Ready"
          />
        </div>
      )}

      {/* Info Section */}
      <div className="bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 rounded-2xl p-8 border border-blue-200 dark:border-blue-700">
        <h3 className="text-2xl font-semibold text-blue-900 dark:text-blue-300 mb-6 text-center">How It Works</h3>
        <div className="grid md:grid-cols-3 gap-8 text-center">
          <div className="flex flex-col items-center space-y-4">
            <div className="w-16 h-16 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-full flex items-center justify-center text-2xl font-bold">1</div>
            <div>
              <p className="text-lg font-semibold text-blue-900 dark:text-blue-300 mb-2">Describe Your Data</p>
              <p className="text-blue-700 dark:text-blue-400">Tell us what blockchain data you want to track in plain English</p>
            </div>
          </div>
          <div className="flex flex-col items-center space-y-4">
            <div className="w-16 h-16 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-full flex items-center justify-center text-2xl font-bold">2</div>
            <div>
              <p className="text-lg font-semibold text-blue-900 dark:text-blue-300 mb-2">AI Generates Your API</p>
              <p className="text-blue-700 dark:text-blue-400">Our AI creates a custom endpoint for your data</p>
            </div>
          </div>
          <div className="flex flex-col items-center space-y-4">
            <div className="w-16 h-16 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-full flex items-center justify-center text-2xl font-bold">3</div>
            <div>
              <p className="text-lg font-semibold text-blue-900 dark:text-blue-300 mb-2">Use Your API</p>
              <p className="text-blue-700 dark:text-blue-400">Copy the URL and start getting live blockchain data</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}