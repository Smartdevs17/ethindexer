"use client";

import Link from 'next/link';
import { Database, ArrowRight, Wallet, Shield } from 'lucide-react';
import { useAccount } from 'wagmi';
import { RainbowKitCustomConnectButton } from '../components/scaffold-eth';

export default function Home() {
  const { isConnected } = useAccount();

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 dark:from-gray-900 dark:to-gray-800">
      {/* Simple Header */}
      <header className="p-6">
        <div className="flex items-center justify-between w-full">
          <div className="flex items-center space-x-2">
            <Database className="h-8 w-8 text-blue-600" />
            <span className="text-xl font-bold text-gray-900 dark:text-white">EthIndexer</span>
          </div>
          <div className="flex items-center justify-end">
            <RainbowKitCustomConnectButton />
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <div className="max-w-4xl mx-auto px-6 py-20 text-center">
        <h1 className="text-5xl font-bold text-gray-900 dark:text-white mb-6">
          Turn Natural Language into{' '}
          <span className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
            Blockchain APIs
          </span>
        </h1>
        
        <p className="text-xl text-gray-600 dark:text-gray-300 mb-8 max-w-2xl mx-auto">
          Index Ethereum data using plain English. Get instant REST API endpoints powered by AI. 
          No technical knowledge required.
        </p>

        {/* Wallet Connection Status */}
        {!isConnected && (
          <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-2xl p-6 mb-8 max-w-2xl mx-auto">
            <div className="flex items-center justify-center gap-3 mb-4">
              <Wallet className="h-6 w-6 text-yellow-600" />
              <h3 className="text-lg font-semibold text-yellow-800 dark:text-yellow-200">Connect Your Wallet to Start</h3>
            </div>
            <p className="text-yellow-700 dark:text-yellow-300 mb-4">
              Connect your wallet to create personalized indexing jobs and track your blockchain data.
            </p>
            <div className="flex justify-center">
              <RainbowKitCustomConnectButton />
            </div>
          </div>
        )}

        {/* Simple Demo */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8 mb-8 max-w-3xl mx-auto">
          <div className="text-left">
            <p className="text-gray-600 dark:text-gray-300 mb-3">Try saying:</p>
            <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg mb-4">
              <code className="text-blue-600 dark:text-blue-400">"Index USDC transfers from the last 1000 blocks"</code>
            </div>
            <p className="text-gray-600 dark:text-gray-300 mb-3">You get:</p>
            <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-lg border border-green-200 dark:border-green-800">
              <code className="text-green-700 dark:text-green-300">GET /api/dynamic/usdc-transfers</code>
            </div>
          </div>
        </div>

        {/* Features */}
        <div className="grid md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white dark:bg-gray-800 p-6 rounded-xl">
            <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center mb-4 mx-auto">
              <Shield className="h-6 w-6 text-blue-600" />
            </div>
            <h3 className="font-semibold text-gray-900 dark:text-white mb-2">Secure & Private</h3>
            <p className="text-gray-600 dark:text-gray-300 text-sm">
              Your wallet connection ensures secure, personalized indexing jobs
            </p>
          </div>
          <div className="bg-white dark:bg-gray-800 p-6 rounded-xl">
            <div className="w-12 h-12 bg-purple-100 dark:bg-purple-900/30 rounded-lg flex items-center justify-center mb-4 mx-auto">
              <Database className="h-6 w-6 text-purple-600" />
            </div>
            <h3 className="font-semibold text-gray-900 dark:text-white mb-2">AI-Powered</h3>
            <p className="text-gray-600 dark:text-gray-300 text-sm">
              Natural language processing turns your requests into smart queries
            </p>
          </div>
          <div className="bg-white dark:bg-gray-800 p-6 rounded-xl">
            <div className="w-12 h-12 bg-green-100 dark:bg-green-900/30 rounded-lg flex items-center justify-center mb-4 mx-auto">
              <ArrowRight className="h-6 w-6 text-green-600" />
            </div>
            <h3 className="font-semibold text-gray-900 dark:text-white mb-2">Instant APIs</h3>
            <p className="text-gray-600 dark:text-gray-300 text-sm">
              Get REST API endpoints immediately for your indexed data
            </p>
          </div>
        </div>

        {/* Call to Action */}
        {isConnected ? (
          <Link 
            href="/app" 
            className="inline-flex items-center gap-2 bg-blue-600 text-white px-8 py-4 rounded-xl text-lg font-semibold hover:bg-blue-700 transition-colors"
          >
            Start Indexing Now
            <ArrowRight className="h-5 w-5" />
          </Link>
        ) : (
          <div className="text-center">
            <p className="text-gray-600 dark:text-gray-300 mb-4">
              Connect your wallet to start creating blockchain APIs
            </p>
            <RainbowKitCustomConnectButton />
          </div>
        )}
      </div>
    </div>
  );
}

