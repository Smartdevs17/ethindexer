"use client";

import React, { useState } from 'react';
import { ArrowRight, Sparkles, Bot, Database, Zap, MessageSquare, Play, CheckCircle, Hash, TrendingUp, Globe, Shield } from 'lucide-react';
import Link from 'next/link';
import { RainbowKitCustomConnectButton } from '../components/scaffold-eth';

export default function HomePage() {
  const [demoQuery, setDemoQuery] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [showResult, setShowResult] = useState(false);

  const handleDemoQuery = async () => {
    if (!demoQuery.trim()) return;
    
    setIsProcessing(true);
    // Simulate processing
    setTimeout(() => {
      setIsProcessing(false);
      setShowResult(true);
    }, 2000);
  };

  const exampleQueries = [
    "Show me all USDC transfers above $10,000",
    "Track my wallet's transaction history",
    "Index WETH swaps on Uniswap",
    "Monitor DeFi protocol activity",
    "Get large transactions from the last 1000 blocks",
    "Track NFT marketplace transfers"
  ];

  const features = [
    {
      icon: <Bot className="h-6 w-6" />,
      title: "Natural Language Queries",
      description: "Ask for blockchain data in plain English. No SQL or complex syntax required."
    },
    {
      icon: <Database className="h-6 w-6" />,
      title: "Instant API Generation",
      description: "Get a custom API endpoint for your data in seconds, not hours."
    },
    {
      icon: <Zap className="h-6 w-6" />,
      title: "Real-time Data",
      description: "Access live blockchain data through your generated API endpoints."
    },
    {
      icon: <Shield className="h-6 w-6" />,
      title: "Privacy First",
      description: "Your queries and data are private. No data mining or tracking."
    }
  ];

  const useCases = [
    {
      title: "DeFi Analytics",
      description: "Track token swaps, liquidity changes, and yield farming activity",
      example: "Show me all USDC/WETH swaps above $50k"
    },
    {
      title: "Wallet Monitoring",
      description: "Monitor your wallet's transaction history and token balances",
      example: "Track all transactions involving my wallet"
    },
    {
      title: "Token Research",
      description: "Analyze token transfer patterns and whale movements",
      example: "Index large transfers for popular tokens"
    },
    {
      title: "Protocol Analysis",
      description: "Study DeFi protocol usage and user behavior",
      example: "Monitor Uniswap V3 trading activity"
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
      {/* Header */}
      <header className="relative z-10">
        <nav className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex justify-between items-center">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-gradient-to-r from-blue-600 to-purple-600 rounded-xl flex items-center justify-center">
                <Hash className="h-6 w-6 text-white" />
              </div>
              <span className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                EthIndexer
              </span>
            </div>
            <div className="flex items-center space-x-4">
              <Link 
                href="/app/query"
                className="hidden md:flex items-center space-x-2 px-4 py-2 text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white transition-colors"
              >
                <MessageSquare className="h-4 w-4" />
                <span>Try Demo</span>
              </Link>
              <RainbowKitCustomConnectButton />
            </div>
          </div>
        </nav>
      </header>

      {/* Hero Section */}
      <section className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-20 pb-32">
        <div className="text-center">
          {/* Main Headline */}
          <div className="mb-8">
            <h1 className="text-5xl md:text-7xl font-bold text-gray-900 dark:text-white mb-6 leading-tight">
              Ask for
              <span className="block bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 bg-clip-text text-transparent">
                Blockchain Data
              </span>
              in Plain English
            </h1>
            <p className="text-xl md:text-2xl text-gray-600 dark:text-gray-300 max-w-4xl mx-auto leading-relaxed">
              Transform how you access blockchain data. No more complex queries or APIs. 
              Just ask naturally and get instant access to the data you need.
            </p>
          </div>

          {/* Interactive Demo */}
          <div className="max-w-4xl mx-auto mb-12">
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700 p-8">
              <div className="text-center mb-6">
                <div className="w-16 h-16 bg-gradient-to-r from-blue-600 to-purple-600 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Bot className="h-8 w-8 text-white" />
                </div>
                <h3 className="text-2xl font-semibold text-gray-900 dark:text-white mb-2">
                  Try It Now
                </h3>
                <p className="text-gray-600 dark:text-gray-400">
                  Ask for any blockchain data and see how it works
                </p>
              </div>

              <div className="space-y-4">
                <div className="relative">
                  <textarea
                    value={demoQuery}
                    onChange={(e) => setDemoQuery(e.target.value)}
                    placeholder="e.g., Show me all USDC transfers above $10,000 from the last 1000 blocks"
                    className="w-full px-4 py-4 text-lg border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400"
                    rows={3}
                    disabled={isProcessing}
                  />
                  <button
                    onClick={handleDemoQuery}
                    disabled={!demoQuery.trim() || isProcessing}
                    className="absolute bottom-3 right-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white px-6 py-2 rounded-lg hover:from-blue-700 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 transition-all transform hover:scale-105"
                  >
                    {isProcessing ? (
                      <>
                        <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full" />
                        Processing...
                      </>
                    ) : (
                      <>
                        <Play className="h-4 w-4" />
                        Generate API
                      </>
                    )}
                  </button>
                </div>

                {/* Example Queries */}
                <div className="text-left">
                  <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">Try these examples:</p>
                  <div className="flex flex-wrap gap-2">
                    {exampleQueries.map((query, index) => (
                      <button
                        key={index}
                        onClick={() => setDemoQuery(query)}
                        className="px-3 py-2 text-sm bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-900/50 transition-colors border border-blue-200 dark:border-blue-700"
                      >
                        {query}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Result Display */}
                {showResult && (
                  <div className="mt-6 p-6 bg-green-50 dark:bg-green-900/20 rounded-xl border border-green-200 dark:border-green-800">
                    <div className="flex items-center space-x-3 mb-3">
                      <CheckCircle className="h-6 w-6 text-green-600" />
                      <h4 className="text-lg font-semibold text-green-800 dark:text-green-300">
                        API Generated Successfully!
                      </h4>
                    </div>
                    <p className="text-green-700 dark:text-green-400 mb-4">
                      Your custom blockchain data API is ready. Connect your wallet to start using it!
                    </p>
                    <Link
                      href="/app/query"
                      className="inline-flex items-center space-x-2 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors"
                    >
                      <span>Create Your Own API</span>
                      <ArrowRight className="h-4 w-4" />
                    </Link>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <Link
              href="/app/query"
              className="flex items-center space-x-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white px-8 py-4 rounded-xl hover:from-blue-700 hover:to-purple-700 transition-all transform hover:scale-105 shadow-lg"
            >
              <Sparkles className="h-5 w-5" />
              <span className="text-lg font-semibold">Start Creating APIs</span>
              <ArrowRight className="h-5 w-5" />
            </Link>
            <Link
              href="/app/apis"
              className="flex items-center space-x-2 bg-white dark:bg-gray-800 text-gray-900 dark:text-white px-8 py-4 rounded-xl border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
            >
              <Database className="h-5 w-5" />
              <span className="text-lg font-semibold">View Examples</span>
            </Link>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 bg-white dark:bg-gray-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">
              Why Choose Natural Language?
            </h2>
            <p className="text-xl text-gray-600 dark:text-gray-300 max-w-3xl mx-auto">
              Traditional blockchain data access requires technical expertise. We make it as simple as asking a question.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            {features.map((feature, index) => (
              <div key={index} className="text-center p-6">
                <div className="w-16 h-16 bg-gradient-to-r from-blue-100 to-purple-100 dark:from-blue-900/30 dark:to-purple-900/30 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <div className="text-blue-600 dark:text-blue-400">
                    {feature.icon}
                  </div>
                </div>
                <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                  {feature.title}
                </h3>
                <p className="text-gray-600 dark:text-gray-400">
                  {feature.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Use Cases Section */}
      <section className="py-20 bg-gray-50 dark:bg-gray-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">
              Perfect For
            </h2>
            <p className="text-xl text-gray-600 dark:text-gray-300 max-w-3xl mx-auto">
              Whether you're a developer, analyst, or researcher, natural language queries make blockchain data accessible to everyone.
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-8">
            {useCases.map((useCase, index) => (
              <div key={index} className="bg-white dark:bg-gray-800 rounded-2xl p-8 border border-gray-200 dark:border-gray-700">
                <h3 className="text-2xl font-semibold text-gray-900 dark:text-white mb-3">
                  {useCase.title}
                </h3>
                <p className="text-gray-600 dark:text-gray-400 mb-4">
                  {useCase.description}
                </p>
                <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4">
                  <p className="text-sm font-medium text-blue-900 dark:text-blue-300 mb-1">
                    Example Query:
                  </p>
                  <p className="text-blue-800 dark:text-blue-400 font-mono text-sm">
                    "{useCase.example}"
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="py-20 bg-white dark:bg-gray-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">
              How It Works
            </h2>
            <p className="text-xl text-gray-600 dark:text-gray-300 max-w-3xl mx-auto">
              Three simple steps to get your custom blockchain data API
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="w-20 h-20 bg-gradient-to-r from-blue-600 to-purple-600 rounded-full flex items-center justify-center mx-auto mb-6 text-white text-2xl font-bold">
                1
              </div>
              <h3 className="text-2xl font-semibold text-gray-900 dark:text-white mb-3">
                Ask Naturally
              </h3>
              <p className="text-gray-600 dark:text-gray-400">
                Describe what blockchain data you want in plain English. No technical knowledge required.
              </p>
            </div>

            <div className="text-center">
              <div className="w-20 h-20 bg-gradient-to-r from-blue-600 to-purple-600 rounded-full flex items-center justify-center mx-auto mb-6 text-white text-2xl font-bold">
                2
              </div>
              <h3 className="text-2xl font-semibold text-gray-900 dark:text-white mb-3">
                AI Generates API
              </h3>
              <p className="text-gray-600 dark:text-gray-400">
                Our AI understands your request and creates a custom API endpoint for your data.
              </p>
            </div>

            <div className="text-center">
              <div className="w-20 h-20 bg-gradient-to-r from-blue-600 to-purple-600 rounded-full flex items-center justify-center mx-auto mb-6 text-white text-2xl font-bold">
                3
              </div>
              <h3 className="text-2xl font-semibold text-gray-900 dark:text-white mb-3">
                Use Your Data
              </h3>
              <p className="text-gray-600 dark:text-gray-400">
                Access live blockchain data through your generated API. Integrate it into any application.
              </p>
            </div>
          </div>

          <div className="text-center mt-12">
            <Link
              href="/app/query"
              className="inline-flex items-center space-x-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white px-8 py-4 rounded-xl hover:from-blue-700 hover:to-purple-700 transition-all transform hover:scale-105 shadow-lg"
            >
              <Sparkles className="h-5 w-5" />
              <span className="text-lg font-semibold">Start Creating Your First API</span>
              <ArrowRight className="h-5 w-5" />
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="flex items-center justify-center space-x-3 mb-6">
            <div className="w-10 h-10 bg-gradient-to-r from-blue-600 to-purple-600 rounded-xl flex items-center justify-center">
              <Hash className="h-6 w-6 text-white" />
            </div>
            <span className="text-2xl font-bold">EthIndexer</span>
          </div>
          <p className="text-gray-400 mb-6">
            Making blockchain data accessible through natural language
          </p>
          <div className="flex justify-center space-x-6">
            <Link href="/app/query" className="text-gray-400 hover:text-white transition-colors">
              Try Demo
            </Link>
            <Link href="/app/apis" className="text-gray-400 hover:text-white transition-colors">
              View APIs
            </Link>
            <Link href="/app/blocks" className="text-gray-400 hover:text-white transition-colors">
              Block Explorer
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}

