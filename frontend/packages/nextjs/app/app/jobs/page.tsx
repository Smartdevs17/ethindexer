"use client";

import React, { useState, useEffect } from 'react';
import { 
  Database, 
  Clock, 
  CheckCircle, 
  AlertCircle, 
  Play, 
  Pause, 
  Trash2, 
  Copy, 
  ExternalLink,
  RefreshCw,
  Filter,
  Search,
  Calendar,
  Activity,
  Wallet
} from 'lucide-react';
import { useAccount } from 'wagmi';
import { useEthIndexer } from '../../../hooks/ethindexer/useEthIndexer';
import { RainbowKitCustomConnectButton } from '../../../components/scaffold-eth';

type JobStatus = 'active' | 'completed' | 'failed' | 'processing' | 'pending';

interface JobFilter {
  status: JobStatus | 'all';
  search: string;
  dateRange: 'all' | 'today' | 'week' | 'month';
}

export default function JobsPage() {
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);
  const [filters, setFilters] = useState<JobFilter>({
    status: 'all',
    search: '',
    dateRange: 'all'
  });
  const [showFilters, setShowFilters] = useState(false);
  const [copiedJobId, setCopiedJobId] = useState<string | null>(null);
  
  const { isConnected } = useAccount();
  const { 
    jobs, 
    fetchJobs, 
    isAuthenticated, 
    isConnected: isBackendConnected,
    forceRefreshJobs 
  } = useEthIndexer();



  const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3001';

  // Show wallet connection requirement if not connected
  if (!isConnected) {
    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">Job History</h2>
          <p className="text-gray-600 dark:text-gray-300">Connect your wallet to view your indexing jobs</p>
        </div>
        
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-8 text-center">
          <Wallet className="h-16 w-16 text-gray-400 dark:text-gray-500 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">Wallet Connection Required</h3>
          <p className="text-gray-600 dark:text-gray-300 mb-6">
            Connect your wallet to view and manage your indexing job history.
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
          <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">Job History</h2>
          <p className="text-gray-600 dark:text-gray-300">Loading your jobs...</p>
        </div>
        
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-8 text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">Loading Your Jobs...</h3>
          <p className="text-gray-600 dark:text-gray-300">
            Please wait while we load your indexing job history.
          </p>
        </div>
      </div>
    );
  }

  // Filter and sort jobs
  const filteredJobs = jobs
    .filter(job => {
      // Filter out jobs without valid jobId or id
      if (!job.jobId && !job.id) {
        return false;
      }
      
      // Filter by status
      if (filters.status !== 'all' && job.status !== filters.status) {
        return false;
      }
      
      // Filter by search
      if (filters.search && !job.message.toLowerCase().includes(filters.search.toLowerCase())) {
        return false;
      }
      
      // Filter by date range
      if (filters.dateRange !== 'all') {
        const jobDate = job.timestamp instanceof Date ? job.timestamp : new Date(job.timestamp);
        const now = new Date();
        const diffTime = Math.abs(now.getTime() - jobDate.getTime());
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        
        switch (filters.dateRange) {
          case 'today':
            if (diffDays > 1) return false;
            break;
          case 'week':
            if (diffDays > 7) return false;
            break;
          case 'month':
            if (diffDays > 30) return false;
            break;
        }
      }
      
      return true;
    })
    .sort((a, b) => {
      const dateA = a.timestamp instanceof Date ? a.timestamp : new Date(a.timestamp);
      const dateB = b.timestamp instanceof Date ? b.timestamp : new Date(b.timestamp);
      return dateB.getTime() - dateA.getTime();
    });



  // Pagination
  const totalJobs = filteredJobs.length;
  const totalPages = Math.ceil(totalJobs / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedJobs = filteredJobs.slice(startIndex, endIndex);

  // Job statistics
  const stats = {
    total: jobs.length,
    active: jobs.filter(j => j.status === 'active' || j.status === 'processing').length,
    completed: jobs.filter(j => j.status === 'completed').length,
    failed: jobs.filter(j => j.status === 'failed').length,
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="h-5 w-5 text-green-600" />;
      case 'active':
      case 'processing':
        return <Activity className="h-5 w-5 text-blue-600 animate-pulse" />;
      case 'failed':
        return <AlertCircle className="h-5 w-5 text-red-600" />;
      default:
        return <Clock className="h-5 w-5 text-gray-600" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300';
      case 'active':
      case 'processing':
        return 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300';
      case 'failed':
        return 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300';
      default:
        return 'bg-gray-100 dark:bg-gray-900/30 text-gray-800 dark:text-gray-300';
    }
  };

  const copyJobId = async (jobId: string) => {
    try {
      await navigator.clipboard.writeText(jobId);
      setCopiedJobId(jobId);
      setTimeout(() => setCopiedJobId(null), 2000);
    } catch (err) {
      console.error('Failed to copy job ID:', err);
    }
  };

  const testApi = (apiUrl: string) => {
    const fullUrl = apiUrl.startsWith('http') ? apiUrl : `${backendUrl}${apiUrl}`;
    window.open(fullUrl, '_blank');
  };

  const handleRefresh = async () => {
    await forceRefreshJobs();
  };

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

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
    const jobId = job.jobId || job.id || generateJobIdFromData(job);
    const status = job.status || 'Unknown';
    
    // 🔧 UPDATED: More informative descriptions for unique endpoints
    return `Job ${jobId} - ${status}: "${query.slice(0, 80)}${query.length > 80 ? '...' : ''}"`;
  }

  return (
    <div className="space-y-6 p-6">
      {/* Page Header */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Job History</h1>
          <p className="text-gray-600 dark:text-gray-300">Track and manage your blockchain indexing jobs</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleRefresh}
            className="flex items-center gap-2 px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
          >
            <RefreshCw className="h-4 w-4" />
            Refresh
          </button>
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Filter className="h-4 w-4" />
            Filters
          </button>
        </div>
      </div>

      {/* Filters */}
      {showFilters && (
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Filter Jobs</h3>
          <div className="grid md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Status</label>
              <select
                value={filters.status}
                onChange={(e) => setFilters(prev => ({ ...prev, status: e.target.value as JobStatus | 'all' }))}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              >
                <option value="all">All Statuses</option>
                <option value="active">Active</option>
                <option value="processing">Processing</option>
                <option value="completed">Completed</option>
                <option value="failed">Failed</option>
                <option value="pending">Pending</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Date Range</label>
              <select
                value={filters.dateRange}
                onChange={(e) => setFilters(prev => ({ ...prev, dateRange: e.target.value as any }))}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              >
                <option value="all">All Time</option>
                <option value="today">Today</option>
                <option value="week">Last 7 Days</option>
                <option value="month">Last 30 Days</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Search</label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search jobs..."
                  value={filters.search}
                  onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
                  className="w-full pl-10 pr-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Statistics */}
      <div className="grid lg:grid-cols-4 gap-6">
        <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between mb-2">
            <h3 className="font-semibold text-gray-900 dark:text-white">Total Jobs</h3>
            <Database className="h-5 w-5 text-blue-600" />
          </div>
          <p className="text-3xl font-bold text-blue-600 mb-1">{stats.total}</p>
          <p className="text-sm text-gray-500 dark:text-gray-400">All time</p>
        </div>
        
        <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between mb-2">
            <h3 className="font-semibold text-gray-900 dark:text-white">Active</h3>
            <Activity className="h-5 w-5 text-yellow-600" />
          </div>
          <p className="text-3xl font-bold text-yellow-600 mb-1">{stats.active}</p>
          <p className="text-sm text-gray-500 dark:text-gray-400">Currently running</p>
        </div>
        
        <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between mb-2">
            <h3 className="font-semibold text-gray-900 dark:text-white">Completed</h3>
            <CheckCircle className="h-5 w-5 text-green-600" />
          </div>
          <p className="text-3xl font-bold text-green-600 mb-1">{stats.completed}</p>
          <p className="text-sm text-gray-500 dark:text-gray-400">Successful</p>
        </div>
        
        <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between mb-2">
            <h3 className="font-semibold text-gray-900 dark:text-white">Failed</h3>
            <AlertCircle className="h-5 w-5 text-red-600" />
          </div>
          <p className="text-3xl font-bold text-red-600 mb-1">{stats.failed}</p>
          <p className="text-sm text-gray-500 dark:text-gray-400">Errors</p>
        </div>
      </div>

      {/* Jobs List */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="p-6 border-b border-gray-200 dark:border-gray-700">
          <h3 className="text-xl font-semibold text-gray-900 dark:text-white">Recent Jobs</h3>
          <p className="text-gray-600 dark:text-gray-300 text-sm">
            Showing {startIndex + 1}-{Math.min(endIndex, totalJobs)} of {totalJobs} jobs
          </p>
        </div>
        
        <div className="divide-y divide-gray-200 dark:divide-gray-700">
          {paginatedJobs.length === 0 ? (
            <div className="p-8 text-center">
              <Database className="h-12 w-12 text-gray-400 dark:text-gray-500 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">No jobs found</h3>
              <p className="text-gray-500 dark:text-gray-400">
                {filters.status !== 'all' || filters.search || filters.dateRange !== 'all' 
                  ? 'Try adjusting your filters to see more jobs.'
                  : 'Create your first indexing job to get started.'
                }
              </p>
            </div>
          ) : (
            paginatedJobs.map((job) => (
              <div key={job.jobId || `job-${Math.random()}`} className="p-6 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      {getStatusIcon(job.status)}
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(job.status)}`}>
                        {job.status}
                      </span>
                      <button
                        onClick={() => job.jobId && copyJobId(job.jobId)}
                        className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
                      >
                        {copiedJobId === job.jobId ? (
                          <>
                            <CheckCircle className="h-3 w-3 text-green-600" />
                            Copied!
                          </>
                        ) : (
                          <>
                            <Copy className="h-3 w-3" />
                            {job.jobId?.slice(0, 8) || 'Unknown'}...
                          </>
                        )}
                      </button>
                    </div>
                    
                    <h4 className="font-medium text-gray-900 dark:text-white mb-2">
                      {job.message || 'Unknown job'}
                    </h4>
                    
                    <div className="flex items-center gap-4 text-sm text-gray-500 dark:text-gray-400 mb-3">
                      <div className="flex items-center gap-1">
                        <Calendar className="h-4 w-4" />
                        {job.timestamp instanceof Date 
                          ? job.timestamp.toLocaleDateString() 
                          : new Date(job.timestamp).toLocaleDateString()
                        }
                      </div>
                      {job.progress !== undefined && (
                        <div className="flex items-center gap-1">
                          <Activity className="h-4 w-4" />
                          {job.progress}% complete
                        </div>
                      )}
                    </div>
                    
                    {/* Progress Bar */}
                    {job.progress !== undefined && job.status !== 'completed' && job.status !== 'failed' && (
                      <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2 mb-3">
                        <div 
                          className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                          style={{ width: `${job.progress}%` }}
                        ></div>
                      </div>
                    )}
                    
                    {/* API URL if available */}
                    {job.apiUrl && (
                      <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-3 mt-3">
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <p className="text-sm font-medium text-blue-900 dark:text-blue-300 mb-1">API Endpoint</p>
                            <p className="text-xs text-blue-800 dark:text-blue-400 font-mono break-all">
                              {job.apiUrl.startsWith('http') ? job.apiUrl : `${backendUrl}${job.apiUrl}`}
                            </p>
                          </div>
                          <button
                            onClick={() => testApi(job.apiUrl!)}
                            className="flex items-center gap-1 px-3 py-1 bg-blue-600 text-white text-xs rounded-lg hover:bg-blue-700 transition-colors"
                          >
                            <ExternalLink className="h-3 w-3" />
                            Test
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex justify-center items-center space-x-2">
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
    </div>
  );
}


