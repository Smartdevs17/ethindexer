"use client";

import React, { useState, useEffect } from 'react';
import { useEthIndexer } from '../../hooks/ethindexer/useEthIndexer';
import { EthIndexerAPI } from '../../services/api/api';
import { ChatInterface } from './chat/ChatInterface';

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
    createJob
  } = useEthIndexer();

  const [queryInput, setQueryInput] = useState('');
  const [isCreatingJob, setIsCreatingJob] = useState(false);
  const [showDebugInfo, setShowDebugInfo] = useState(false);
  const [backendStats, setBackendStats] = useState<any>(null);
  const [showCompletedJobs, setShowCompletedJobs] = useState(false);
  
  // NEW: Chat UI toggle state
  const [activeInterface, setActiveInterface] = useState<'simple' | 'chat'>('simple');

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
      const result = await createJob(queryInput);
      setQueryInput('');
      return result;
    } catch (error) {
      console.error('Failed to create job:', error);
      alert(
        `Failed to create job: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
      throw error;
    } finally {
      setIsCreatingJob(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleCreateJob();
    }
  };

  // Filter jobs based on toggle
  const displayJobs = showCompletedJobs 
    ? jobs 
    : jobs.filter(job => job.status !== 'completed');

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-2">
            🚀 EthIndexer Dashboard
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            AI-powered blockchain data indexing with natural language queries
          </p>
          
          {/* Connection Status */}
          <div className="flex items-center justify-center mt-4 space-x-4">
            <div className={`flex items-center space-x-2 ${isConnected ? 'text-green-600' : 'text-red-600'}`}>
              <div className={`w-3 h-3 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`}></div>
              <span className="text-sm font-medium">
                {isConnected ? 'Connected' : 'Disconnected'}
              </span>
            </div>
            {connectedClients > 0 && (
              <span className="text-sm text-gray-500">
                {connectedClients} client{connectedClients !== 1 ? 's' : ''} connected
              </span>
            )}
          </div>
        </div>

        {/* NEW: Interface Toggle */}
        <div className="flex justify-center mb-6">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-1 shadow-lg">
            <button
              onClick={() => setActiveInterface('simple')}
              className={`px-6 py-2 rounded-md text-sm font-medium transition-colors ${
                activeInterface === 'simple'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
              }`}
            >
              📝 Simple Input
            </button>
            <button
              onClick={() => setActiveInterface('chat')}
              className={`px-6 py-2 rounded-md text-sm font-medium transition-colors ${
                activeInterface === 'chat'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
              }`}
            >
              💬 Chat Interface
            </button>
          </div>
        </div>

        {/* Conditional Interface Rendering */}
        {activeInterface === 'simple' ? (
          /* Original Simple Input Interface */
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 mb-8">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
              ✨ Create Indexing Job
            </h2>
            
            <div className="space-y-4">
              <div className="flex gap-4">
                <input
                  type="text"
                  value={queryInput}
                  onChange={(e) => setQueryInput(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder="Enter your natural language query (e.g., 'Index USDC transfers from block 18000000')"
                  className="flex-1 px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  disabled={isCreatingJob}
                />
                <button
                  onClick={handleCreateJob}
                  disabled={isCreatingJob || !queryInput.trim()}
                  className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed font-medium"
                >
                  {isCreatingJob ? '⏳ Creating...' : '🚀 Create Job'}
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
        ) : (
          /* NEW: Chat Interface */
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg mb-8 h-[600px]">
            <ChatInterface
              onExecuteQuery={handleCreateJob}
              isProcessing={isCreatingJob}
              systemStatus={systemStatus}
            />
          </div>
        )}

        {/* Jobs and Transfers Grid - Keep existing code */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          
          {/* Jobs Section */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                📊 Jobs Overview ({displayJobs.length})
              </h2>
              <button
                onClick={() => setShowCompletedJobs(!showCompletedJobs)}
                className="text-sm px-3 py-1 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
              >
                {showCompletedJobs ? '🔍 Hide Completed' : '📋 Show All'}
              </button>
            </div>
            
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {displayJobs.length === 0 ? (
                <div className="text-center py-12">
                  <div className="text-6xl mb-4">📊</div>
                  <p className="text-gray-500 dark:text-gray-400">
                    {activeInterface === 'chat' ? 'No jobs yet' : 'No active jobs'}
                  </p>
                  <p className="text-sm text-gray-400 dark:text-gray-500 mt-2">
                    {activeInterface === 'chat' 
                      ? 'Start a conversation to create indexing jobs!'
                      : 'Create your first indexing job above'
                    }
                  </p>
                </div>
              ) : (
                displayJobs.map((job) => (
                  <div key={job.jobId} className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 space-y-2">
                    <div className="flex items-center justify-between">
                      <h3 className="font-medium text-gray-900 dark:text-white">
                        {job.jobId}
                      </h3>
                      <span className={`px-2 py-1 text-xs rounded-full ${
                        job.status === 'active' 
                          ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
                          : job.status === 'completed'
                          ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                          : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                      }`}>
                        {job.status}
                      </span>
                    </div>
                    
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      {job.message}
                    </p>
                    
                    <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                      <div 
                        className="bg-blue-600 h-2 rounded-full transition-all duration-300" 
                        style={{ width: `${job.progress}%` }}
                      />
                    </div>
                    
                    <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400">
                      <span>{job.progress}% complete</span>
                      <span>{job.timestamp ? new Date(job.timestamp).toLocaleTimeString() : 'No timestamp'}</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Transfers Section */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
              💰 Recent Transfers ({transfers.length})
            </h2>
            
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {transfers.length === 0 ? (
                <div className="text-center py-12">
                  <div className="text-6xl mb-4">📊</div>
                  <p className="text-gray-500 dark:text-gray-400">No transfers yet</p>
                  <p className="text-sm text-gray-400 dark:text-gray-500 mt-2">
                    Start indexing to see real-time transfer data
                  </p>
                </div>
              ) : (
                transfers.map((transfer) => (
                  <div key={transfer.id} className="border border-gray-200 dark:border-gray-700 rounded-lg p-3">
                    <div className="flex justify-between items-start mb-2">
                      <div className="flex items-center space-x-2">
                        <span className="font-mono text-sm bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded">
                          {transfer.token?.symbol || 'TOKEN'}
                        </span>
                        <span className="text-sm font-medium">
                          {parseFloat(transfer.value).toLocaleString()}
                        </span>
                      </div>
                      <span className="text-xs text-gray-500">
                        Block {transfer.blockNumber}
                      </span>
                    </div>
                    
                    <div className="text-xs text-gray-600 dark:text-gray-400 space-y-1">
                      <div>From: {transfer.from.slice(0, 8)}...{transfer.from.slice(-6)}</div>
                      <div>To: {transfer.to.slice(0, 8)}...{transfer.to.slice(-6)}</div>
                      <div>Tx: {transfer.txHash.slice(0, 12)}...</div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Debug Toggle */}
        <div className="text-center mt-8">
          <button
            onClick={() => setShowDebugInfo(!showDebugInfo)}
            className="text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
          >
            {showDebugInfo ? 'Hide' : 'Show'} Debug Info
          </button>
        </div>

        {/* Debug Panel */}
        {showDebugInfo && debugInfo.length > 0 && (
          <div className="mt-4 bg-gray-900 text-green-400 rounded-xl p-6 font-mono text-sm">
            <h3 className="text-white font-bold mb-4">🔍 Debug Information</h3>
            <div className="space-y-1 max-h-64 overflow-y-auto">
              {debugInfo.map((info, index) => (
                <div key={index} className="text-green-400">
                  {info}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};