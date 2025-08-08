// Enhanced Dashboard.tsx with better job handling
"use client";

import React, { useState, useEffect } from "react";
import { useEthIndexer } from "../../hooks/ethindexer/useEthIndexer";
import { EthIndexerAPI } from "../../services/api/api";
import { ChatInterface } from "./chat/ChatInterface";

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
    forceRefreshJobs, // Use the new force refresh function
  } = useEthIndexer();

  const [queryInput, setQueryInput] = useState("");
  const [isCreatingJob, setIsCreatingJob] = useState(false);
  const [showDebugInfo, setShowDebugInfo] = useState(false);
  const [showCompletedJobs, setShowCompletedJobs] = useState(false);

  // Chat UI toggle state
  const [activeInterface, setActiveInterface] = useState<"simple" | "chat">("simple");

  // Load backend stats on component mount
  useEffect(() => {
    const loadStats = async () => {
      try {
        await Promise.all([EthIndexerAPI.getHealth(), EthIndexerAPI.getIndexerStats()]);
      } catch (error) {
        console.error("Failed to load backend stats:", error);
      }
    };

    loadStats();
    const interval = setInterval(loadStats, 30000);
    return () => clearInterval(interval);
  }, []);

  // Enhanced handleCreateJob that works for both simple and chat interfaces
  const handleCreateJob = async (query?: string) => {
    const queryToUse = query || queryInput.trim();
    if (!queryToUse) return;
    
    console.log('🏗️ Dashboard creating job:', queryToUse);
    console.log('🔍 Job creation context:', {
      fromChat: !!query,
      fromSimple: !query,
      queryLength: queryToUse.length
    });
    
    setIsCreatingJob(true);
    
    try {
      const result = await createJob(queryToUse);
      console.log('✅ Dashboard job creation result:', result);
      
      // Clear input only if using simple interface
      if (!query) {
        setQueryInput('');
      }
      
      // Force refresh after a short delay
      setTimeout(() => {
        forceRefreshJobs();
      }, 500);
      
      return result;
    } catch (error) {
      console.error('❌ Dashboard job creation failed:', error);
      alert(`Failed to create job: ${error instanceof Error ? error.message : String(error)}`);
      throw error;
    } finally {
      setIsCreatingJob(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleCreateJob();
    }
  };

  // Enhanced job timestamp formatter with detailed debugging
  const formatJobTimestamp = (timestamp: any, jobId?: string): string => {
    if (!timestamp) {
      console.warn(`⚠️ Job ${jobId}: No timestamp provided`);
      return 'No timestamp';
    }
    
    try {
      let date: Date;
      
      console.log(`🕐 Job ${jobId}: Formatting timestamp:`, {
        value: timestamp,
        type: typeof timestamp,
        isDate: timestamp instanceof Date,
        toString: String(timestamp)
      });
      
      if (timestamp instanceof Date) {
        date = timestamp;
      } else if (typeof timestamp === 'string') {
        date = new Date(timestamp);
      } else if (typeof timestamp === 'number') {
        date = new Date(timestamp);
      } else {
        console.warn(`⚠️ Job ${jobId}: Invalid timestamp type:`, typeof timestamp, timestamp);
        return 'Invalid type';
      }
      
      if (isNaN(date.getTime())) {
        console.warn(`⚠️ Job ${jobId}: Invalid date created:`, timestamp);
        return 'Invalid date';
      }
      
      const formatted = date.toLocaleDateString();
      console.log(`✅ Job ${jobId}: Formatted timestamp successfully:`, formatted);
      return formatted;
    } catch (error) {
      console.error(`❌ Job ${jobId}: Error formatting timestamp:`, error, timestamp);
      return 'Format error';
    }
  };

  // Filter jobs based on toggle
  const displayJobs = showCompletedJobs ? jobs : jobs.filter((job) => job.status !== "completed");

  // Debug: Log jobs whenever they change
  useEffect(() => {
    console.log('📊 Jobs state updated:', {
      totalJobs: jobs.length,
      displayJobs: displayJobs.length,
      jobs: jobs.map(job => ({
        id: job.jobId,
        status: job.status,
        timestamp: job.timestamp,
        timestampType: typeof job.timestamp
      }))
    });
  }, [jobs, displayJobs]);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-4">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">
            🚀 EthIndexer Dashboard
          </h1>

          {/* Connection Status */}
          <div className="inline-flex items-center space-x-2">
            <div
              className={`w-3 h-3 rounded-full ${
                isConnected ? "text-green-600" : "text-red-600"
              }`}
            >
              <div className={`w-full h-full rounded-full ${isConnected ? "bg-green-500" : "bg-red-500"}`} />
            </div>
            <span className="text-sm text-gray-600 dark:text-gray-400">
              {isConnected ? "Connected" : "Disconnected"}
            </span>
            <span className="text-xs text-gray-500">
              ({connectedClients} client{connectedClients !== 1 ? "s" : ""})
            </span>
          </div>
        </div>

        {/* Interface Toggle */}
        <div className="flex justify-center mb-6">
          <div className="bg-gray-100 dark:bg-gray-800 p-1 rounded-lg">
            <button
              onClick={() => setActiveInterface("simple")}
              className={`px-4 py-2 rounded-md transition-colors ${
                activeInterface === "simple"
                  ? "bg-blue-600 text-white shadow-sm"
                  : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200"
              }`}
            >
              🔧 Simple
            </button>
            <button
              onClick={() => setActiveInterface("chat")}
              className={`px-4 py-2 rounded-md transition-colors ${
                activeInterface === "chat"
                  ? "bg-blue-600 text-white shadow-sm"
                  : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200"
              }`}
            >
              💬 Chat
            </button>
          </div>
        </div>

        {activeInterface === "simple" ? (
          /* Simple Interface */
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 mb-8">
            <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-6">
              ✨ Create Indexing Job
            </h2>

            <div className="space-y-4">
              <div>
                <textarea
                  value={queryInput}
                  onChange={(e) => setQueryInput(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder="Enter your indexing query (e.g., 'Index USDC transfers from block 18000000')"
                  className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                  rows={3}
                />
              </div>

              <button
                onClick={() => handleCreateJob()}
                disabled={!queryInput.trim() || isCreatingJob}
                className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white py-3 px-6 rounded-lg font-medium transition-colors disabled:cursor-not-allowed"
              >
                {isCreatingJob ? "⏳ Creating..." : "🚀 Create Job"}
              </button>
            </div>

            {/* Query Templates */}
            <div className="mt-4">
              <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">💡 Example Queries:</p>
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
              <div className="mt-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                <h4 className="font-medium text-blue-900 dark:text-blue-100 mb-1">System Status</h4>
                <p className="text-sm text-blue-800 dark:text-blue-200">{systemStatus}</p>
              </div>
            )}
          </div>
        ) : (
          /* Chat Interface */
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg mb-8 h-[600px]">
            <ChatInterface
              onExecuteQuery={handleCreateJob}
              isProcessing={isCreatingJob}
              systemStatus={systemStatus}
            />
          </div>
        )}

        {/* Jobs and Transfers Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Jobs Section */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                📊 Jobs Overview ({displayJobs.length})
              </h2>
              <div className="flex gap-2">
                <button
                  onClick={forceRefreshJobs}
                  className="text-sm px-3 py-1 bg-blue-100 dark:bg-blue-700 rounded-lg hover:bg-blue-200 dark:hover:bg-blue-600 transition-colors"
                >
                  🔄 Refresh
                </button>
                <button
                  onClick={() => setShowCompletedJobs(!showCompletedJobs)}
                  className="text-sm px-3 py-1 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                >
                  {showCompletedJobs ? "🔍 Hide Completed" : "📋 Show All"}
                </button>
              </div>
            </div>

            <div className="space-y-3 max-h-96 overflow-y-auto">
              {displayJobs.length === 0 ? (
                <div className="text-center py-12">
                  <div className="text-6xl mb-4">📊</div>
                  <p className="text-gray-500 dark:text-gray-400">
                    {activeInterface === "chat" ? "No jobs yet" : "No active jobs"}
                  </p>
                  <p className="text-sm text-gray-400 dark:text-gray-500 mt-2">
                    {activeInterface === "chat"
                      ? "Start a conversation to create indexing jobs!"
                      : "Create your first indexing job above"}
                  </p>
                </div>
              ) : (
                displayJobs.map((job) => (
                  <div key={job.jobId} className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 space-y-2">
                    <div className="flex items-center justify-between">
                      <h3 className="font-medium text-gray-900 dark:text-white">{job.jobId}</h3>
                      <span
                        className={`px-2 py-1 text-xs rounded-full ${
                          job.status === "active"
                            ? "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200"
                            : job.status === "completed"
                            ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
                            : "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200"
                        }`}
                      >
                        {job.status}
                      </span>
                    </div>

                    <p className="text-sm text-gray-600 dark:text-gray-400">{job.message}</p>

                    <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                      <div
                        className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                        style={{ width: `${job.progress}%` }}
                      />
                    </div>

                    <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400">
                      <span>{job.progress}% complete</span>
                      <span>{formatJobTimestamp(job.timestamp, job.jobId)}</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Transfers Section */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                💸 Recent Transfers ({transfers.length})
              </h2>
            </div>

            <div className="space-y-3 max-h-96 overflow-y-auto">
              {transfers.length === 0 ? (
                <div className="text-center py-12">
                  <div className="text-6xl mb-4">💸</div>
                  <p className="text-gray-500 dark:text-gray-400">No transfers found</p>
                  <p className="text-sm text-gray-400 dark:text-gray-500 mt-2">
                    Transfer data will appear here once indexing jobs complete
                  </p>
                </div>
              ) : (
                transfers.map((transfer) => (
                  <div
                    key={`${transfer.txHash}-${transfer.id}`}
                    className="border border-gray-200 dark:border-gray-700 rounded-lg p-4"
                  >
                    <div className="flex justify-between items-start mb-2">
                      <span className="text-sm font-medium text-gray-900 dark:text-white">
                        {transfer.token?.symbol || "TOKEN"}
                      </span>
                      <span className="text-sm font-bold text-green-600 dark:text-green-400">
                        {parseFloat(transfer.value).toLocaleString()}
                      </span>
                    </div>

                    <div className="text-xs text-gray-500 dark:text-gray-400 space-y-1">
                      <div>Block {transfer.blockNumber}</div>
                      <div>
                        From: {transfer.from.slice(0, 8)}...{transfer.from.slice(-6)}
                      </div>
                      <div>
                        To: {transfer.to.slice(0, 8)}...{transfer.to.slice(-6)}
                      </div>
                      <div>
                        Tx: {transfer.txHash.slice(0, 8)}...{transfer.txHash.slice(-6)}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Debug Panel */}
        <div className="mt-8 bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">🔍 Debug Info</h2>
            <button
              onClick={() => setShowDebugInfo(!showDebugInfo)}
              className="text-sm px-3 py-1 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
            >
              {showDebugInfo ? "Hide" : "Show"}
            </button>
          </div>

          {showDebugInfo && (
            <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4 space-y-4">
              {/* Recent debug messages */}
              <div>
                <h4 className="font-semibold text-sm mb-2">Recent Activity:</h4>
                <div className="space-y-1 max-h-40 overflow-y-auto">
                  {debugInfo.slice(0, 10).map((info, index) => (
                    <div key={index} className="text-xs text-gray-600 dark:text-gray-400">
                      {info}
                    </div>
                  ))}
                </div>
              </div>
              
              {/* System state */}
              <div>
                <h4 className="font-semibold text-sm mb-2">System State:</h4>
                <pre className="text-xs text-gray-600 dark:text-gray-400 overflow-auto">
                  {JSON.stringify(
                    {
                      isConnected,
                      connectedClients,
                      jobsCount: jobs.length,
                      transfersCount: transfers.length,
                      systemStatus,
                      lastJobTimestamps: jobs.slice(0, 3).map(job => ({
                        id: job.jobId,
                        timestamp: job.timestamp,
                        timestampType: typeof job.timestamp
                      }))
                    },
                    null,
                    2,
                  )}
                </pre>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};