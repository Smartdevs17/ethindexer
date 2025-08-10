"use client";

import React, { useState, useEffect } from 'react';
import { Copy, ExternalLink, Check, Link as LinkIcon, Zap } from 'lucide-react';
import { useEthIndexer } from '../../../hooks/ethindexer/useEthIndexer';

export default function MyAPIsPage() {
  const [copiedUrl, setCopiedUrl] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);
  
  // Get real data from your existing hook
  const { jobs, isConnected, fetchJobs } = useEthIndexer();
  
  const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3001';

  // Transform jobs with API URLs into user-friendly API cards
  // Deduplicate by jobId to prevent React key conflicts
  const uniqueJobs = jobs.filter((job, index, self) => 
    index === self.findIndex(j => j.jobId === job.jobId)
  );
  
  // Create APIs from jobs with intelligent URL generation and deduplication
  const allUserAPIs = uniqueJobs
    .filter(job => {
      // Show ALL jobs that have any message - very inclusive filtering
      const hasMessage = job.message && job.message.length > 0;
      
      // Include any job that has a message, regardless of status or progress
      return hasMessage;
    })
    .map(job => {
      // Generate API URL based on job data
      let apiUrl = job.apiUrl;
      
      // If no apiUrl, try to generate one based on the job message
      if (!apiUrl && job.message) {
        const message = job.message.toLowerCase();
        if (message.includes('usdc')) {
          apiUrl = '/api/usdc-transfers';
        } else if (message.includes('weth')) {
          apiUrl = '/api/weth-transfers';
        } else if (message.includes('usdt')) {
          apiUrl = '/api/usdt-transfers';
        } else if (message.includes('dai')) {
          apiUrl = '/api/dai-transfers';
        } else {
          // Default to transfers endpoint
          apiUrl = '/api/transfers';
        }
      }
      
      // Fallback to job ID if still no URL
      if (!apiUrl && job.jobId) {
        apiUrl = `/api/job/${job.jobId}`;
      }
      
      return {
        id: job.jobId || `job-${Date.now()}-${Math.random()}`, // Ensure unique ID
        title: generateAPITitle(job),
        description: generateAPIDescription(job),
        url: apiUrl || `/api/job/${job.jobId || 'default'}`,
        query: job.message || 'Custom blockchain query',
        status: 'ready', // Show all jobs with messages as ready
        createdAt: job.timestamp,
        requests: 0, // Can be enhanced later with usage tracking
        lastUsed: 'Recently'
      };
    })
    // Deduplicate APIs by URL to group similar jobs
    .filter((api, index, self) => 
      index === self.findIndex(a => a.url === api.url)
    );

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

  // Load more jobs if we're on the last page and have few items
  useEffect(() => {
    if (currentPage === totalPages && userAPIs.length < itemsPerPage && totalAPIs > 0) {
      console.log('🔄 Loading more jobs...');
      fetchJobs(50, jobs.length);
    }
  }, [currentPage, totalPages, userAPIs.length, itemsPerPage, totalAPIs, fetchJobs, jobs.length]);

  // Helper functions to create user-friendly names
  function generateAPITitle(job: any): string {
    const query = job.message || '';
    
    if (query.toLowerCase().includes('usdc')) return 'USDC Transfers API';
    if (query.toLowerCase().includes('weth')) return 'WETH Transfers API';
    if (query.toLowerCase().includes('usdt')) return 'USDT Transfers API';
    if (query.toLowerCase().includes('dai')) return 'DAI Transfers API';
    
    // Extract token symbol or use generic name
    const tokenMatch = query.match(/([A-Z]{2,5})\s+transfer/i);
    if (tokenMatch) return `${tokenMatch[1].toUpperCase()} Transfers API`;
    
    return `Blockchain Data API`;
  }

  function generateAPIDescription(job: any): string {
    const query = job.message || '';
    return `Generated from: "${query.slice(0, 80)}${query.length > 80 ? '...' : ''}"`;
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

  // Show connection status
  if (!isConnected) {
    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-3xl font-bold text-gray-900 dark:text-white">Your APIs</h2>
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
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-bold text-gray-900 dark:text-white">Your APIs</h2>
          <p className="text-gray-600 dark:text-gray-400">Generated endpoints ready to use</p>
        </div>
        <div className="text-sm text-gray-500 dark:text-gray-400">
          {totalAPIs} endpoint{totalAPIs !== 1 ? 's' : ''} created
        </div>
      </div>
      
      <div className="grid gap-6">
        {userAPIs.map((api) => (
          <div key={api.id} className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden hover:shadow-md transition-shadow">
            <div className="p-6">
              <div className="flex justify-between items-start mb-4">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="text-xl font-semibold text-gray-900 dark:text-white">{api.title}</h3>
                    <span className="px-3 py-1 bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300 text-sm font-medium rounded-full">
                      ✅ Ready
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
        ))}
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
          {totalAPIs < 50 && (
            <button
              onClick={() => {
                console.log('🔄 Manually loading more jobs...');
                fetchJobs(50, jobs.length);
              }}
              className="inline-flex items-center px-4 py-2 text-sm font-medium text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-colors"
            >
              <Zap className="h-4 w-4 mr-2" />
              Load More APIs
            </button>
          )}
        </div>
      )}
    </div>
  );
}