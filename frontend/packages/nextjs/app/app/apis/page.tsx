"use client";

import React, { useState, useEffect } from 'react';
import { Copy, ExternalLink, Check, Link as LinkIcon, Zap, Wallet } from 'lucide-react';
import { useAccount } from 'wagmi';
import { useEthIndexer } from '../../../hooks/ethindexer/useEthIndexer';
import { RainbowKitCustomConnectButton } from '../../../components/scaffold-eth';

export default function MyAPIsPage() {
  // ALL HOOKS MUST BE CALLED AT THE TOP LEVEL - BEFORE ANY CONDITIONAL RETURNS
  const [copiedUrl, setCopiedUrl] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  
  const { isConnected } = useAccount();
  const { jobs, isConnected: isBackendConnected, fetchJobs, isAuthenticated } = useEthIndexer();
  
  const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3001';
    
  // Each job gets its own endpoint: /api/dynamic/usdc-transfers/job123, /api/dynamic/usdc-transfers/job456
  // No more URL deduplication needed - backend handles uniqueness
  // Deduplicate by jobId to prevent React key conflicts
  console.log(`🔄 Processing ${jobs.length} jobs from useEthIndexer hook`);
  const uniqueJobs = jobs.filter((job, index, self) => 
    index === self.findIndex(j => j.jobId === job.jobId)
  );
  
  // Create APIs from jobs with intelligent URL generation and deduplication
  const allUserAPIs = uniqueJobs
    .filter(job => {
      // 🔧 FIXED: Only show jobs that are COMPLETED and have API endpoints
      const hasMessage = job.message && job.message.length > 0;
      const isCompleted = job.status === 'completed';
      const hasApiEndpoint = job.apiUrl && job.apiUrl.length > 0;
      
      // Job must be completed AND have an API endpoint to be shown
      return hasMessage && isCompleted && hasApiEndpoint;
    })
    .map(job => {
      // 🔧 DEBUG: Log job structure to understand the data
      console.log('🔍 Processing job:', {
        jobId: job.jobId,
        status: job.status,
        message: job.message,
        apiUrl: job.apiUrl,
        generatedId: generateJobIdFromData(job)
      });
      
      // 🔧 UPDATED: Use backend's unique API URLs when available
      let apiUrl = job.apiUrl;
      
      // If no apiUrl from backend, skip this job (shouldn't happen with our filter)
      if (!apiUrl || !job.apiUrl) {
        const jobId = job.jobId || generateJobIdFromData(job);
        console.warn(`⚠️ Job ${jobId} has no API endpoint despite being completed`);
        return null;
      }
      
      return {
        id: job.jobId || generateJobIdFromData(job), // Ensure unique ID using our new function
        title: generateAPITitle(job),
        description: generateAPIDescription(job),
        url: apiUrl,
        query: job.message || 'Custom blockchain query',
        status: job.status || 'completed', // Use actual job status
        createdAt: job.timestamp,
        requests: 0, // Can be enhanced later with usage tracking
        lastUsed: 'Recently'
      };
    })
    .filter(Boolean); // Remove any null entries
    // 🔧 REMOVED: URL deduplication - backend now provides unique endpoints per job

  // Pagination logic
  const totalAPIs = allUserAPIs.length;
  const totalPages = Math.ceil(totalAPIs / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const userAPIs = allUserAPIs.slice(startIndex, endIndex);

  // Handle page changes
  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // FIXED: This useEffect should only run once when the component mounts, not on every render
  // The previous version was causing infinite loops by including jobs.length in dependencies
  useEffect(() => {
    // Only fetch jobs once when the component mounts and user is authenticated
    if (isConnected && isAuthenticated && jobs.length === 0) {
      console.log('🔄 Initial jobs fetch...');
      fetchJobs(50, 0); // Start from offset 0, don't append
    }
  }, [isConnected, isAuthenticated, fetchJobs]); // Remove jobs.length from dependencies to prevent infinite loop

  // Helper functions to create user-friendly names
  function generateAPITitle(job: any): string {
    const query = job.message || '';
    // 🔧 FIXED: Generate a unique job ID from available data since backend doesn't send jobId
    const jobId = job.jobId || generateJobIdFromData(job);
    
    // 🔧 UPDATED: Generate titles that work with unique endpoints
    if (query.toLowerCase().includes('usdc')) return `USDC Transfers API (Job ${jobId})`;
    if (query.toLowerCase().includes('weth')) return `WETH Transfers API (Job ${jobId})`;
    if (query.toLowerCase().includes('usdt')) return `USDT Transfers API (Job ${jobId})`;
    if (query.toLowerCase().includes('dai')) return `DAI Transfers API (Job ${jobId})`;
    
    // Extract token symbol or use generic name
    const tokenMatch = query.match(/([A-Z]{2,5})\s+transfer/i);
    if (tokenMatch) return `${tokenMatch[1].toUpperCase()} Transfers API (Job ${jobId})`;
    
    return `Blockchain Data API (Job ${jobId})`;
  }

  // 🔧 NEW: Generate a unique job ID from available job data
  function generateJobIdFromData(job: any): string {
    // Try to create a unique ID from timestamp and message hash
    if (job.timestamp) {
      const timestamp = new Date(job.timestamp).getTime();
      const messageHash = job.message ? job.message.split(' ').join('').slice(0, 8) : 'job';
      return `${messageHash}-${timestamp}`;
    }
    
    // Fallback to a random ID if no timestamp
    return `job-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  function generateAPIDescription(job: any): string {
    const query = job.message || '';
    // 🔧 FIXED: Generate a unique job ID from available data since backend doesn't send jobId
    const jobId = job.jobId || generateJobIdFromData(job);
    const status = job.status || 'Unknown';
    
    // 🔧 UPDATED: More informative descriptions for unique endpoints
    return `Job ${jobId} - ${status}: "${query.slice(0, 80)}${query.length > 80 ? '...' : ''}"`;
  }

  const copyApiUrl = async (url: string) => {
    try {
      // Check if URL already contains the backend URL
      const fullUrl = url.startsWith('http') ? url : `${backendUrl}${url}`;
      await navigator.clipboard.writeText(fullUrl);
      setCopiedUrl(url);
      setTimeout(() => setCopiedUrl(null), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const testApi = (url: string) => {
    // Check if URL already contains the backend URL
    const fullUrl = url.startsWith('http') ? url : `${backendUrl}${url}`;
    window.open(fullUrl, '_blank');
  };

  // NOW WE CAN HANDLE CONDITIONAL RENDERING AFTER ALL HOOKS HAVE BEEN CALLED
  
  // Show wallet connection requirement if not connected
  if (!isConnected) {
    return (
      <div className="space-y-6 p-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Your APIs</h1>
          <p className="text-gray-600 dark:text-gray-300">Connect your wallet to view your indexing APIs</p>
        </div>
        
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-8 text-center">
          <Wallet className="h-16 w-16 text-gray-400 dark:text-gray-500 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">Wallet Connection Required</h3>
          <p className="text-gray-600 dark:text-gray-300 mb-6">
            Connect your wallet to view and manage your personalized indexing APIs.
          </p>
          <RainbowKitCustomConnectButton />
        </div>
      </div>
    );
  }

  // Show authentication loading if connected but not authenticated
  if (isConnected && !isAuthenticated) {
    return (
      <div className="space-y-6 p-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Your APIs</h1>
          <p className="text-gray-600 dark:text-gray-300">Loading your APIs...</p>
        </div>
        
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-8 text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">Loading Your APIs...</h3>
          <p className="text-gray-600 dark:text-gray-300">
            Please wait while we load your indexing APIs and job history.
          </p>
        </div>
      </div>
    );
  }

  // Show connection status
  if (!isBackendConnected) {
    return (
      <div className="space-y-6 p-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Your APIs</h1>
          <p className="text-gray-600 dark:text-gray-400">Generated endpoints ready to use</p>
        </div>
        
        <div className="text-center py-16 bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700">
          <div className="animate-pulse">
            <div className="w-2 h-2 bg-red-500 rounded-full mx-auto mb-4"></div>
          </div>
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">Connecting to backend...</h3>
          <p className="text-gray-600 dark:text-gray-400">Please wait while we establish connection</p>
        </div>
      </div>
    );
  }

  // Show empty state if no APIs
  if (userAPIs.length === 0) {
    // Check if there are any jobs that are still processing
    const processingJobs = uniqueJobs.filter(job => 
      job.status !== 'completed' && job.message && job.message.length > 0
    );
    
    if (processingJobs.length > 0) {
      // Show processing jobs instead of empty state
      return (
        <div className="space-y-6 p-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Your APIs</h1>
            <p className="text-gray-600 dark:text-gray-400">Generated endpoints ready to use</p>
          </div>
          
          <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-8">
            <h3 className="text-xl font-medium text-gray-900 dark:text-white mb-4">Jobs in Progress</h3>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              You have {processingJobs.length} indexing job{processingJobs.length !== 1 ? 's' : ''} currently processing. 
              API endpoints will be available once they complete.
            </p>
            
            <div className="space-y-4">
              {processingJobs.map((job) => (
                <div key={job.jobId} className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                  <div className="flex-1">
                    <h4 className="font-medium text-gray-900 dark:text-white">
                      {generateAPITitle(job)}
                    </h4>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      {job.message}
                    </p>
                    <div className="flex items-center gap-2 mt-2">
                      <div className="w-full bg-gray-200 dark:bg-gray-600 rounded-full h-2">
                        <div 
                          className="bg-blue-600 h-2 rounded-full transition-all duration-300" 
                          style={{ width: `${job.progress || 0}%` }}
                        ></div>
                      </div>
                      <span className="text-sm text-gray-500 dark:text-gray-400">
                        {Math.round(job.progress || 0)}%
                      </span>
                    </div>
                  </div>
                  <div className="ml-4">
                    <span className="px-3 py-1 bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300 text-sm font-medium rounded-full">
                      ⏳ {job.status || 'Processing'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      );
    }
    
    // No APIs and no processing jobs
    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-3xl font-bold text-gray-900 dark:text-white">Your APIs</h2>
          <p className="text-gray-600 dark:text-gray-400">Generated endpoints ready to use</p>
        </div>
        
        <div className="text-center py-16 bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700">
          <LinkIcon className="h-16 w-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-xl font-medium text-gray-900 dark:text-white mb-2">No APIs yet</h3>
          <p className="text-gray-600 dark:text-gray-400 mb-6">Create your first API endpoint to get started</p>
          <a
            href="/app/query"
            className="inline-flex items-center px-6 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors"
          >
            <Zap className="h-4 w-4 mr-2" />
            Create Your First API
          </a>
        </div>
      </div>
    );
  }

  // Show beautiful API cards (user-focused, no technical jargon)
  return (
    <div className="space-y-6 p-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Your APIs</h1>
          <p className="text-gray-600 dark:text-gray-400">Generated endpoints ready to use</p>
        </div>
        <div className="text-sm text-gray-500 dark:text-gray-400">
          {totalAPIs} endpoint{totalAPIs !== 1 ? 's' : ''} created
        </div>
      </div>
      
      <div className="grid gap-6">
        {userAPIs.map((api) => {
          // 🔧 Type guard to ensure api is not null
          if (!api) return null;
          
          return (
            <div key={api.id} className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden hover:shadow-md transition-shadow">
              <div className="p-6">
                <div className="flex justify-between items-start mb-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-xl font-semibold text-gray-900 dark:text-white">{api.title}</h3>
                      <span className={`px-3 py-1 text-sm font-medium rounded-full ${
                        api.status === 'completed' 
                          ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300'
                          : 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300'
                      }`}>
                        {api.status === 'completed' ? '✅ Ready' : '⏳ Processing'}
                      </span>
                    </div>
                    <p className="text-gray-600 dark:text-gray-400 mb-3">{api.description}</p>
                    <div className="text-sm text-gray-500 dark:text-gray-500">
                      Created {api.createdAt instanceof Date ? api.createdAt.toLocaleDateString() : new Date(api.createdAt).toLocaleDateString()} • Last used {api.lastUsed}
                    </div>
                  </div>
                </div>
              
              {/* API URL Section - The most important part */}
              <div className="bg-gray-50 dark:bg-gray-900/50 rounded-xl p-4 mb-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">API Endpoint</span>
                  <div className="flex gap-2">
                    <button
                      onClick={() => api.url && copyApiUrl(api.url)}
                      className={`flex items-center gap-1 px-3 py-1 text-sm rounded-lg transition-colors ${
                        copiedUrl === api.url 
                          ? 'bg-green-600 text-white' 
                          : 'bg-blue-600 text-white hover:bg-blue-700'
                      }`}
                    >
                      {copiedUrl === api.url ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                      {copiedUrl === api.url ? 'Copied!' : 'Copy'}
                    </button>
                    <button
                      onClick={() => api.url && testApi(api.url)}
                      className="flex items-center gap-1 px-3 py-1 bg-gray-600 dark:bg-gray-700 text-white text-sm rounded-lg hover:bg-gray-700 dark:hover:bg-gray-600 transition-colors"
                    >
                      <ExternalLink className="h-3 w-3" />
                      Test
                    </button>
                  </div>
                </div>
                <div className="bg-white dark:bg-gray-800 rounded-lg p-3 border border-gray-200 dark:border-gray-600">
                  <code className="text-sm font-mono text-gray-800 dark:text-gray-200 break-all">
                    {api.url.startsWith('http') ? api.url : `${backendUrl}${api.url}`}
                  </code>
                </div>
              </div>
              
              {/* Query Information */}
              <div className="bg-blue-50 dark:bg-blue-900/20 rounded-xl p-4 mb-4">
                <h4 className="text-sm font-medium text-blue-900 dark:text-blue-300 mb-2">Original Query</h4>
                <p className="text-sm text-blue-800 dark:text-blue-400">"{api.query}"</p>
              </div>
              
              {/* Usage Examples */}
              <div className="grid md:grid-cols-3 gap-4">
                <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-lg p-3">
                  <div className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-2">JavaScript</div>
                  <code className="text-xs text-gray-800 dark:text-gray-300 block overflow-x-auto">
                    fetch('{api.url.startsWith('http') ? api.url : `${backendUrl}${api.url}`}')
                  </code>
                </div>
                <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-lg p-3">
                  <div className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-2">Python</div>
                  <code className="text-xs text-gray-800 dark:text-gray-300 block overflow-x-auto">
                    requests.get('{api.url.startsWith('http') ? api.url : `${backendUrl}${api.url}`}')
                  </code>
                </div>
                <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-lg p-3">
                  <div className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-2">cURL</div>
                  <code className="text-xs text-gray-800 dark:text-gray-300 block overflow-x-auto">
                    curl {api.url.startsWith('http') ? api.url : `${backendUrl}${api.url}`}
                  </code>
                </div>
              </div>
            </div>
          </div>
        );
        })}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex justify-center items-center space-x-2 mt-8">
          <button
            onClick={() => handlePageChange(currentPage - 1)}
            disabled={currentPage === 1}
            className="px-4 py-2 text-sm font-medium text-gray-500 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            Previous
          </button>
          
          <div className="flex items-center space-x-1">
            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
              let pageNum;
              if (totalPages <= 5) {
                pageNum = i + 1;
              } else if (currentPage <= 3) {
                pageNum = i + 1;
              } else if (currentPage >= totalPages - 2) {
                pageNum = totalPages - 4 + i;
              } else {
                pageNum = currentPage - 2 + i;
              }
              
              // Ensure pageNum is within valid range and use index as fallback for key
              const validPageNum = Math.max(1, Math.min(pageNum, totalPages));
              
              return (
                <button
                  key={`page-${validPageNum}-${i}`}
                  onClick={() => handlePageChange(validPageNum)}
                  className={`px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
                    currentPage === validPageNum
                      ? 'bg-blue-600 text-white'
                      : 'text-gray-500 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700'
                  }`}
                >
                  {validPageNum}
                </button>
              );
            })}
          </div>
          
          <button
            onClick={() => handlePageChange(currentPage + 1)}
            disabled={currentPage === totalPages}
            className="px-4 py-2 text-sm font-medium text-gray-500 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            Next
          </button>
        </div>
      )}

      {/* Load More Button for better UX */}
      {totalAPIs > 0 && (
        <div className="text-center mt-6">
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">
            Showing {startIndex + 1}-{Math.min(endIndex, totalAPIs)} of {totalAPIs} APIs
          </p>
          {/* Only show Load More if we have more jobs to fetch from backend */}
          {jobs.length < 50 && (
            <button
              onClick={async () => {
                if (isLoadingMore) return; // Prevent multiple simultaneous requests
                setIsLoadingMore(true);
                try {
                  console.log('🔄 Manually loading more jobs from backend...');
                  // Use a fixed offset to prevent infinite loops
                  const nextOffset = Math.max(jobs.length, 0);
                  await fetchJobs(50, nextOffset);
                } finally {
                  setIsLoadingMore(false);
                }
              }}
              disabled={isLoadingMore}
              className="inline-flex items-center px-4 py-2 text-sm font-medium text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoadingMore ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600 mr-2"></div>
                  Loading...
                </>
              ) : (
                <>
                  <Zap className="h-4 w-4 mr-2" />
                  Load More Jobs from Backend
                </>
              )}
            </button>
          )}
        </div>
      )}
    </div>
  );
}