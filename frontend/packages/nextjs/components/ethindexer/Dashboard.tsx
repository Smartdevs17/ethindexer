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
    activeJobsCount,
    completedJobsCount,
    totalJobsCount,
    createJob,
    fetchJobs,
    refreshJobs,
    getStats,
    removeJob
  } = useEthIndexer();

  const [queryInput, setQueryInput] = useState('');
  const [isCreatingJob, setIsCreatingJob] = useState(false);
  const [showDebugInfo, setShowDebugInfo] = useState(false);
  const [backendStats, setBackendStats] = useState<any>(null);
  const [showCompletedJobs, setShowCompletedJobs] = useState(true);

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
          error instanceof Error ? error.message : 'Unknown error'
        }`
      );
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

        {/* Query Input */}
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

            {/* Controls */}
            <div className="flex justify-between items-center">
              <button
                onClick={() => setShowDebugInfo(!showDebugInfo)}
                className="text-sm text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200"
              >
                🔍 {showDebugInfo ? 'Hide' : 'Show'} Debug
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
          
          {/* Jobs Section - IMPROVED */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                📊 Jobs Overview
              </h2>
              <div className="flex gap-2">
                <button
                  onClick={refreshJobs}
                  className="text-sm px-3 py-1 bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 rounded-lg hover:bg-blue-200 dark:hover:bg-blue-800 transition-colors"
                  title="Refresh jobs from API"
                >
                  🔄 Refresh
                </button>
                <button
                  onClick={() => setShowCompletedJobs(!showCompletedJobs)}
                  className="text-sm px-3 py-1 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                >
                  {showCompletedJobs ? 'Hide Completed' : 'Show All'}
                </button>
              </div>
            </div>

            {/* Job Statistics */}
            <div className="grid grid-cols-3 gap-4 mb-6">
              <div className="text-center p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                  {activeJobsCount}
                </div>
                <div className="text-sm text-blue-800 dark:text-blue-300">
                  Active Jobs
                </div>
              </div>
              <div className="text-center p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
                <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                  {completedJobsCount}
                </div>
                <div className="text-sm text-green-800 dark:text-green-300">
                  Completed
                </div>
              </div>
              <div className="text-center p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                <div className="text-2xl font-bold text-gray-600 dark:text-gray-400">
                  {totalJobsCount}
                </div>
                <div className="text-sm text-gray-800 dark:text-gray-300">
                  Total Jobs
                </div>
              </div>
            </div>
            
            {/* Jobs List */}
            <div className="space-y-4 max-h-96 overflow-y-auto">
              {displayJobs.length === 0 ? (
                <div className="text-center py-12">
                  <div className="text-6xl mb-4">🏗️</div>
                  <p className="text-gray-500 dark:text-gray-400">
                    {showCompletedJobs ? 'No jobs yet' : 'No active jobs'}
                  </p>
                  <p className="text-sm text-gray-400 dark:text-gray-500 mt-2">
                    Create a job using the query builder above
                  </p>
                </div>
              ) : (
                displayJobs.map((job, index) => (
                  <div key={job.jobId} className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 space-y-3">
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <h4 className="font-medium text-gray-900 dark:text-white">
                            Job: {job.jobId.slice(0, 8)}...
                          </h4>
                          {job.isLocal && (
                            <span className="px-2 py-1 text-xs bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200 rounded">
                              Local
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                          {job.message}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                          Status: {job.status} | {new Date(job.timestamp).toLocaleTimeString()}
                        </p>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <div className={`px-3 py-1 rounded-full text-xs font-medium ${
                          job.status === 'completed' 
                            ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                            : job.status === 'error'
                            ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                            : 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
                        }`}>
                          {job.progress}%
                        </div>
                        
                        {/* Remove button for completed jobs */}
                        {job.status === 'completed' && (
                          <button
                            onClick={() => removeJob(job.jobId)}
                            className="text-gray-400 hover:text-red-600 text-xs"
                            title="Remove job"
                          >
                            ✕
                          </button>
                        )}
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
                        ></div>
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

        {/* Debug Panel */}
        {showDebugInfo && (
          <div className="mt-8 bg-gray-900 text-green-400 rounded-xl p-6 font-mono text-sm">
            <h3 className="text-white font-bold mb-4">🔍 Debug Information</h3>
            <div className="mb-4 p-3 bg-red-900/20 border border-red-500 rounded">
              <p className="text-red-400 font-bold">⚠️ WebSocket Issue Detected:</p>
              <p className="text-red-300">• system-status events: ✅ Working</p>
              <p className="text-red-300">• job-progress-global events: ❌ Check backend logs</p>
              <p className="text-yellow-300">→ Using API polling as fallback (every 3s)</p>
              <p className="text-blue-300">• Backend jobs API: ✅ Working ({totalJobsCount} jobs loaded)</p>
            </div>
            <div className="space-y-1 max-h-64 overflow-y-auto">
              {debugInfo.length === 0 ? (
                <p className="text-gray-500">No debug information yet...</p>
              ) : (
                debugInfo.map((info, index) => (
                  <div key={index} className={`${
                    info.includes('RECEIVED job-progress-global') ? 'text-green-400 font-bold' :
                    info.includes('job-progress-global') ? 'text-red-400' :
                    info.includes('System:') ? 'text-green-400' :
                    info.includes('API') || info.includes('Loaded') || info.includes('Refreshed') ? 'text-blue-400' :
                    info.includes('WebSocket event:') ? 'text-yellow-400' :
                    'text-green-400'
                  }`}>
                    {info}
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* Backend Stats */}
        {backendStats && (
          <div className="mt-8 bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
            <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
              ⚡ System Status
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h4 className="font-medium text-gray-900 dark:text-white mb-2">Health Check</h4>
                <div className="text-sm text-gray-600 dark:text-gray-400">
                  Status: <span className="text-green-600 font-medium">{backendStats.health?.status || 'Unknown'}</span>
                </div>
              </div>
              <div>
                <h4 className="font-medium text-gray-900 dark:text-white mb-2">Indexer Stats</h4>
                <div className="text-sm text-gray-600 dark:text-gray-400">
                  Current Block: <span className="font-mono">{backendStats.indexerStats?.currentBlock || 'N/A'}</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};