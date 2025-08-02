"use client";

import React, { useState, useEffect } from 'react';
import { useEthIndexer } from '../../hooks/ethindexer/useEthIndexer';
import { EthIndexerAPI } from '../../services/api/api';

// Example query templates
const QUERY_TEMPLATES = [
  "Index USDC transfers from block 18000000",
  "Index WETH transfers for address 0x742d35cc44b75c42b4b6c5a8b964b08d2a6f6c42",
  "Index all transfers from block 18000000 to 18001000",
  "Index USDT transfers from block 19000000",
  "Index transfers for 0xdac17f958d2ee523a2206206994597c13d831ec7",
];

export const EthIndexerDashboard = () => {
  const { 
    isConnected, 
    jobs, 
    transfers, 
    systemStatus, 
    connectedClients,
    debugInfo,
    createJob,
    fetchJobs,
    getStats 
  } = useEthIndexer();

  const [queryInput, setQueryInput] = useState('');
  const [isCreatingJob, setIsCreatingJob] = useState(false);
  const [showDebugInfo, setShowDebugInfo] = useState(false);
  const [backendStats, setBackendStats] = useState<any>(null);

  // Load backend stats on component mount
  useEffect(() => {
    const loadStats = async () => {
      try {
        const [health, indexerStats] = await Promise.all([
          EthIndexerAPI.getHealth(),
          EthIndexerAPI.getIndexerStats(),
        ]);
        
        setBackendStats({ health, indexerStats });
      } catch (error) {
        console.error('Failed to load backend stats:', error);
      }
    };

    loadStats();
    
    // Refresh stats every 30 seconds
    const interval = setInterval(loadStats, 30000);
    return () => clearInterval(interval);
  }, []);

  const handleCreateJob = async () => {
    if (!queryInput.trim()) return;
    
    setIsCreatingJob(true);
    try {
      await createJob(queryInput);
      setQueryInput('');
    } catch (error) {
      console.error('Failed to create job:', error);
      alert(
        `Failed to create job: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
    } finally {
      setIsCreatingJob(false);
    }
  };

  const handleQuickAction = async (action: string) => {
    try {
      switch (action) {
        case 'hot-data':
          await EthIndexerAPI.indexHotData();
          break;
        case 'popular-tokens':
          await EthIndexerAPI.initializePopularTokens();
          break;
        case 'fetch-jobs':
          await fetchJobs();
          break;
        case 'get-stats':
          getStats();
          break;
      }
    } catch (error) {
      console.error(`Failed to execute ${action}:`, error);
      alert(
        `Failed to execute ${action}: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
      <div className="container mx-auto px-4 py-8 max-w-7xl">
        
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-5xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent mb-4">
            🚀 EthIndexer Dashboard
          </h1>
          <p className="text-xl text-gray-600 dark:text-gray-300 mb-6">
            AI-Powered Blockchain Data Indexing Platform
          </p>
          
          {/* Status Bar */}
          <div className="flex flex-wrap justify-center items-center gap-4 mb-6">
            <div className={`px-4 py-2 rounded-full text-sm font-medium ${
              isConnected 
                ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' 
                : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
            }`}>
              {isConnected ? '🟢 Connected' : '🔴 Disconnected'}
            </div>
            
            <div className="px-4 py-2 bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200 rounded-full text-sm font-medium">
              🏗️ {jobs.length} Active Jobs
            </div>
            
            <div className="px-4 py-2 bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200 rounded-full text-sm font-medium">
              💰 {transfers.length} Recent Transfers
            </div>
            
            <div className="px-4 py-2 bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200 rounded-full text-sm font-medium">
              👥 {connectedClients} Clients
            </div>

            {backendStats?.indexerStats && (
              <div className="px-4 py-2 bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-200 rounded-full text-sm font-medium">
                📦 Block {backendStats.indexerStats.blockchain?.latestBlock}
              </div>
            )}
          </div>
        </div>

        {/* Quick Actions */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 mb-8">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
            Create Indexing Job
          </h2>
          
          <div className="space-y-4">
            {/* Query Input */}
            <div className="flex gap-4">
              <input
                type="text"
                placeholder="Enter your indexing query..."
                value={queryInput}
                onChange={(e) => setQueryInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && !isCreatingJob && handleCreateJob()}
                className="flex-1 px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                disabled={isCreatingJob}
              />
              
              <button
                onClick={handleCreateJob}
                disabled={isCreatingJob || !queryInput.trim()}
                className="px-6 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors min-w-[120px]"
              >
                {isCreatingJob ? (
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    Creating...
                  </div>
                ) : (
                  'Create Job'
                )}
              </button>
            </div>

            {/* Quick Actions */}
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => handleQuickAction('hot-data')}
                className="px-3 py-1 text-sm bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200 rounded-md hover:bg-orange-200 dark:hover:bg-orange-800 transition-colors"
              >
                🔥 Index Hot Data
              </button>
              
              <button
                onClick={() => handleQuickAction('popular-tokens')}
                className="px-3 py-1 text-sm bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200 rounded-md hover:bg-green-200 dark:hover:bg-green-800 transition-colors"
              >
                ⭐ Init Popular Tokens
              </button>
              
              <button
                onClick={() => handleQuickAction('fetch-jobs')}
                className="px-3 py-1 text-sm bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200 rounded-md hover:bg-blue-200 dark:hover:bg-blue-800 transition-colors"
              >
                📋 Fetch Jobs
              </button>
              
              <button
                onClick={() => setShowDebugInfo(!showDebugInfo)}
                className="px-3 py-1 text-sm bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200 rounded-md hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
              >
                🐛 {showDebugInfo ? 'Hide' : 'Show'} Debug
              </button>
            </div>

            {/* Query Templates */}
            <div>
              <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                💡 Example Queries:
              </p>
              <div className="flex flex-wrap gap-2">
                {QUERY_TEMPLATES.map((template, index) => (
                  <button
                    key={index}
                    onClick={() => setQueryInput(template)}
                    className="px-3 py-1 text-xs bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300 rounded hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                  >
                    {template}
                  </button>
                ))}
              </div>
            </div>

            {/* System Status */}
            {systemStatus && (
              <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                <h4 className="font-medium text-blue-900 dark:text-blue-100 mb-1">
                  System Status
                </h4>
                <p className="text-sm text-blue-800 dark:text-blue-200">
                  {systemStatus}
                </p>
              </div>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          
          {/* Active Jobs */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
              Active Jobs ({jobs.length})
            </h2>
            
            <div className="space-y-4 max-h-96 overflow-y-auto">
              {jobs.length === 0 ? (
                <div className="text-center py-12">
                  <div className="text-6xl mb-4">🏗️</div>
                  <p className="text-gray-500 dark:text-gray-400">No active jobs</p>
                  <p className="text-sm text-gray-400 dark:text-gray-500 mt-2">
                    Create a job using the query builder above
                  </p>
                </div>
              ) : (
                jobs.map((job) => (
                  <div key={job.jobId} className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 space-y-3">
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <h4 className="font-medium text-gray-900 dark:text-white">
                          Job: {job.jobId.slice(0, 8)}...
                        </h4>
                        <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                          {job.message}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                          Status: {job.status} | {new Date(job.timestamp).toLocaleTimeString()}
                        </p>
                      </div>
                      
                      <div className={`px-3 py-1 rounded-full text-xs font-medium ${
                        job.status === 'completed' 
                          ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                          : job.status === 'error'
                          ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                          : 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
                      }`}>
                        {job.progress}%
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm text-gray-600 dark:text-gray-400">
                        <span>Progress</span>
                        <span>{job.progress}%</span>
                      </div>
                      <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                        <div
                          className={`h-2 rounded-full transition-all duration-300 ${
                            job.status === 'completed' 
                              ? 'bg-green-500'
                              : job.status === 'error'
                              ? 'bg-red-500'
                              : 'bg-blue-500'
                          }`}
                          style={{ width: `${job.progress}%` }}
                        />
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Recent Transfers */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
              Recent Transfers ({transfers.length})
            </h2>
            
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {transfers.length === 0 ? (
                <div className="text-center py-12">
                  <div className="text-6xl mb-4">💰</div>
                  <p className="text-gray-500 dark:text-gray-400">No recent transfers</p>
                  <p className="text-sm text-gray-400 dark:text-gray-500 mt-2">
                    Transfers will appear here as jobs index blockchain data
                  </p>
                </div>
              ) : (
                transfers.map((transfer) => (
                  <div key={transfer.id} className="border border-gray-200 dark:border-gray-700 rounded-lg p-3">
                    <div className="flex justify-between items-start">
                      <div className="space-y-1 flex-1">
                        <h4 className="font-medium text-sm text-gray-900 dark:text-white">
                          {transfer.value} {transfer.token.symbol || 'tokens'}
                        </h4>
                        <p className="text-xs text-gray-600 dark:text-gray-400">
                          From: {transfer.from.slice(0, 10)}...
                        </p>
                        <p className="text-xs text-gray-600 dark:text-gray-400">
                          To: {transfer.to.slice(0, 10)}...
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-500">
                          Tx: {transfer.txHash.slice(0, 10)}...
                        </p>
                      </div>
                      
                      <div className="text-xs text-gray-500 dark:text-gray-500 text-right">
                        <p>Block: {transfer.blockNumber}</p>
                        <p>{new Date(transfer.timestamp).toLocaleTimeString()}</p>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Debug Information */}
        {showDebugInfo && (
          <div className="mt-8 bg-gray-900 text-green-400 rounded-xl p-6 font-mono text-sm">
            <h3 className="text-lg font-bold text-white mb-4">🐛 Debug Information</h3>
            <div className="space-y-1 max-h-64 overflow-y-auto">
              {debugInfo.length === 0 ? (
                <p className="text-gray-500">No debug information available</p>
              ) : (
                debugInfo.map((info, index) => (
                  <div key={index} className="text-xs">
                    {info}
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};