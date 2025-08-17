"use client";

import React, { useState, useEffect } from 'react';
import { Search, Filter, Download, ChevronLeft, ChevronRight, ExternalLink, Hash, Clock, Zap, Users, Calendar, FileText, FileJson, FileSpreadsheet } from 'lucide-react';
import { useAccount } from 'wagmi';
import { useEthIndexer } from '../../../hooks/ethindexer/useEthIndexer';
import { RainbowKitCustomConnectButton } from '../../../components/scaffold-eth';

// Interface for block data from backend
interface Block {
  id: string;
  number: number;
  hash: string;
  timestamp: string;
  transactions: number;
  gasUsed: string;
  gasLimit: string;
  miner: string;
  difficulty: string;
  totalDifficulty: string;
  size: number;
  extraData: string;
  nonce: string;
  baseFeePerGas: string;
}

export default function BlocksPage() {
  // ALL HOOKS MUST BE CALLED AT THE TOP LEVEL - BEFORE ANY CONDITIONAL RETURNS
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(50);
  const [isLoading, setIsLoading] = useState(false);
  const [filters, setFilters] = useState({
    blockRange: 'all-time',
    validator: '',
    minTransactions: 0,
    maxTransactions: Infinity,
    minGasUsed: 0,
    maxGasUsed: Infinity,
  });
  const [showFilters, setShowFilters] = useState(false);
  const [showExportOptions, setShowExportOptions] = useState(false);
  const [exportFormat, setExportFormat] = useState<'csv' | 'json' | 'excel'>('csv');
  const [exportScope, setExportScope] = useState<'current' | 'all' | 'filtered'>('current');
  const [isExporting, setIsExporting] = useState(false);
  
  const { isConnected } = useAccount();
  const { isConnected: isBackendConnected, isAuthenticated } = useEthIndexer();
  
  const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3001';

  // Block data from backend
  const [blocks, setBlocks] = useState<Block[]>([]);
  const [totalBlocks, setTotalBlocks] = useState(0);
  const [latestBlock, setLatestBlock] = useState(0);
  const [avgTransactions, setAvgTransactions] = useState(0);
  const [avgBlockTime, setAvgBlockTime] = useState(12);

  // Load blocks data
  useEffect(() => {
    if (isConnected && isAuthenticated) {
      loadBlocks();
    }
  }, [isConnected, isAuthenticated, currentPage, filters]);

  // Close export options when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Element;
      if (showExportOptions && !target.closest('.export-dropdown')) {
        setShowExportOptions(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showExportOptions]);

  const loadBlocks = async () => {
    setIsLoading(true);
    try {
      // Build query parameters
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: itemsPerPage.toString(),
      });

      // Add filters
      if (filters.blockRange && filters.blockRange !== 'all-time') {
        params.append('blockRange', filters.blockRange);
      }
      if (filters.validator) {
        params.append('validator', filters.validator);
      }
      if (filters.minTransactions > 0) {
        params.append('minTransactions', filters.minTransactions.toString());
      }
      if (filters.maxTransactions !== Infinity) {
        params.append('maxTransactions', filters.maxTransactions.toString());
      }
      if (filters.minGasUsed > 0) {
        params.append('minGasUsed', (filters.minGasUsed / 1000000).toString());
      }
      if (filters.maxGasUsed !== Infinity) {
        params.append('maxGasUsed', (filters.maxGasUsed / 1000000).toString());
      }

      const response = await fetch(`${backendUrl}/api/blocks?${params.toString()}`);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      
      setBlocks(data.blocks || []);
      setTotalBlocks(data.totalBlocks || 0);
      setLatestBlock(data.latestBlock || 0);
      setAvgTransactions(data.avgTransactions || 0);
      setAvgBlockTime(data.avgBlockTime || 12);
      
    } catch (error) {
      console.error('Failed to load blocks:', error);
      // Set empty state if API fails
      setBlocks([]);
      setTotalBlocks(0);
      setLatestBlock(0);
      setAvgTransactions(0);
      setAvgBlockTime(12);
    } finally {
      setIsLoading(false);
    }
  };



  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!searchQuery.trim()) {
      setCurrentPage(1);
      loadBlocks();
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch(`${backendUrl}/api/blocks/search?q=${encodeURIComponent(searchQuery.trim())}`);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      
      if (data.blocks && data.blocks.length > 0) {
        setBlocks(data.blocks);
        setTotalBlocks(data.total);
        setCurrentPage(1);
      } else {
        // No results found
        setBlocks([]);
        setTotalBlocks(0);
        setCurrentPage(1);
      }
    } catch (error) {
      console.error('Failed to search blocks:', error);
      // Set empty state if search fails
      setBlocks([]);
      setTotalBlocks(0);
    } finally {
      setIsLoading(false);
    }
  };

  const handleFilterChange = (key: string, value: any) => {
    setFilters(prev => ({ ...prev, [key]: value }));
    setCurrentPage(1);
  };

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const exportData = () => {
    setShowExportOptions(!showExportOptions);
  };

  // Helper function to format data for export
  const formatDataForExport = (data: Block[]) => {
    return data.map(block => ({
      'Block Number': block.number,
      'Block Hash': block.hash,
      'Timestamp': new Date(block.timestamp).toISOString(),
      'Transactions': block.transactions,
      'Gas Used': block.gasUsed,
      'Gas Limit': block.gasLimit,
      'Miner': block.miner,
      'Difficulty': block.difficulty,
      'Total Difficulty': block.totalDifficulty,
      'Size (bytes)': block.size,
      'Extra Data': block.extraData,
      'Nonce': block.nonce,
      'Base Fee Per Gas': block.baseFeePerGas,
    }));
  };

  // Export data as CSV
  const exportAsCSV = (data: any[], filename: string) => {
    if (data.length === 0) return;
    
    const headers = Object.keys(data[0]);
    const csvContent = [
      headers.join(','),
      ...data.map(row => 
        headers.map(header => {
          const value = row[header];
          if (typeof value === 'string' && (value.includes(',') || value.includes('"'))) {
            return `"${value.replace(/"/g, '""')}"`;
          }
          return value;
        }).join(',')
      )
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `${filename}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Export data as JSON
  const exportAsJSON = (data: any[], filename: string) => {
    if (data.length === 0) return;
    
    const jsonContent = JSON.stringify(data, null, 2);
    const blob = new Blob([jsonContent], { type: 'application/json;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `${filename}.json`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Export data as Excel (XLSX) - using CSV format with .xlsx extension for compatibility
  const exportAsExcel = (data: any[], filename: string) => {
    if (data.length === 0) return;
    
    const headers = Object.keys(data[0]);
    const csvContent = [
      headers.join('\t'),
      ...data.map(row => 
        headers.map(header => {
          const value = row[header];
          if (typeof value === 'string' && (value.includes('\t') || value.includes('"'))) {
            return `"${value.replace(/"/g, '""')}"`;
          }
          return value;
        }).join('\t')
      )
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'application/vnd.ms-excel;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `${filename}.xlsx`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Main export function
  const handleExport = async () => {
    setIsExporting(true);
    try {
      let dataToExport: Block[] = [];
      let filename = '';

      switch (exportScope) {
        case 'current':
          dataToExport = blocks;
          filename = `blocks-page-${currentPage}-${new Date().toISOString().split('T')[0]}`;
          break;
        
        case 'all':
          const allResponse = await fetch(`${backendUrl}/api/blocks?limit=10000`);
          if (allResponse.ok) {
            const allData = await allResponse.json();
            dataToExport = allData.blocks || [];
            filename = `all-blocks-${new Date().toISOString().split('T')[0]}`;
          }
          break;
        
        case 'filtered':
          const params = new URLSearchParams({
            page: '1',
            limit: '10000',
          });

          if (filters.blockRange && filters.blockRange !== 'all-time') {
            params.append('blockRange', filters.blockRange);
          }
          if (filters.validator) {
            params.append('validator', filters.validator);
          }
          if (filters.minTransactions > 0) {
            params.append('minTransactions', filters.minTransactions.toString());
          }
          if (filters.maxTransactions !== Infinity) {
            params.append('maxTransactions', filters.maxTransactions.toString());
          }
          if (filters.minGasUsed > 0) {
            params.append('minGasUsed', (filters.minGasUsed / 1000000).toString());
          }
          if (filters.maxGasUsed !== Infinity) {
            params.append('maxGasUsed', (filters.maxGasUsed / 1000000).toString());
          }

          const filteredResponse = await fetch(`${backendUrl}/api/blocks?${params.toString()}`);
          if (filteredResponse.ok) {
            const filteredData = await filteredResponse.json();
            dataToExport = filteredData.blocks || [];
            filename = `filtered-blocks-${new Date().toISOString().split('T')[0]}`;
          }
          break;
      }

      if (dataToExport.length === 0) {
        alert('No data to export');
        return;
      }

      const formattedData = formatDataForExport(dataToExport);

      switch (exportFormat) {
        case 'csv':
          exportAsCSV(formattedData, filename);
          break;
        case 'json':
          exportAsJSON(formattedData, filename);
          break;
        case 'excel':
          exportAsExcel(formattedData, filename);
          break;
      }

      setShowExportOptions(false);
      
    } catch (error) {
      console.error('Export failed:', error);
      alert('Export failed. Please try again.');
    } finally {
      setIsExporting(false);
    }
  };

  const formatBlockNumber = (number: number) => {
    return number.toLocaleString();
  };

  const formatGasUsed = (gas: string | number) => {
    const gasNum = typeof gas === 'string' ? parseInt(gas) || 0 : gas;
    if (gasNum >= 1000000) {
      return `${(gasNum / 1000000).toFixed(1)}M`;
    }
    if (gasNum >= 1000) {
      return `${(gasNum / 1000).toFixed(1)}K`;
    }
    return gasNum.toString();
  };

  const formatAddress = (address: string) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  const formatHash = (hash: string) => {
    return `${hash.slice(0, 10)}...${hash.slice(-8)}`;
  };

  const formatTimestamp = (timestamp: string | Date) => {
    const date = typeof timestamp === 'string' ? new Date(timestamp) : timestamp;
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  // NOW WE CAN HANDLE CONDITIONAL RENDERING AFTER ALL HOOKS HAVE BEEN CALLED
  
  // Show wallet connection requirement if not connected
  if (!isConnected) {
    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">Blocks Explorer</h2>
          <p className="text-gray-600 dark:text-gray-300">Connect your wallet to explore blockchain blocks</p>
        </div>
        
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-8 text-center">
          <Hash className="h-16 w-16 text-gray-400 dark:text-gray-500 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">Wallet Connection Required</h3>
          <p className="text-gray-600 dark:text-gray-300 mb-6">
            Connect your wallet to explore and analyze blockchain blocks.
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
          <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">Blocks Explorer</h2>
          <p className="text-gray-600 dark:text-gray-300">Loading blockchain data...</p>
        </div>
        
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-8 text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">Loading Blockchain Data...</h3>
          <p className="text-gray-600 dark:text-gray-300">
            Please wait while we load the latest blockchain blocks and statistics.
          </p>
        </div>
      </div>
    );
  }

  // Show connection status
  if (!isBackendConnected) {
    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-3xl font-bold text-gray-900 dark:text-white">Blocks Explorer</h2>
          <p className="text-gray-600 dark:text-gray-400">Loading blockchain data...</p>
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

  const totalPages = Math.ceil(totalBlocks / itemsPerPage);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <h2 className="text-3xl font-bold text-gray-900 dark:text-white">Blocks Explorer</h2>
          <p className="text-gray-600 dark:text-gray-400">Explore blockchain blocks aggregated from ERC-20 transfer activity</p>
        </div>
        
        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg border transition-colors ${
              showFilters 
                ? 'bg-blue-50 border-blue-200 text-blue-700 dark:bg-blue-900/20 dark:border-blue-800 dark:text-blue-400'
                : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-50 dark:bg-gray-800 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700'
            }`}
          >
            <Filter className="h-4 w-4" />
            Filters
          </button>
          
          <div className="relative">
            <button
              onClick={exportData}
              className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors dark:bg-gray-800 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700"
            >
              <Download className="h-4 w-4" />
              Export
            </button>
            
            {/* Export Options Dropdown */}
            {showExportOptions && (
              <div className="export-dropdown absolute right-0 top-full mt-2 w-80 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg z-50">
                <div className="p-4">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Export Options</h3>
                  
                  {/* Export Scope */}
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Export Scope
                    </label>
                    <select
                      value={exportScope}
                      onChange={(e) => setExportScope(e.target.value as 'current' | 'all' | 'filtered')}
                      className="w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="current">Current Page ({blocks.length} blocks)</option>
                      <option value="all">All Blocks (up to 10,000)</option>
                      <option value="filtered">Filtered Results</option>
                    </select>
                  </div>
                  
                  {/* Export Format */}
                  <div className="mb-6">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Export Format
                    </label>
                    <div className="grid grid-cols-3 gap-2">
                      <button
                        onClick={() => setExportFormat('csv')}
                        className={`flex items-center justify-center gap-2 px-3 py-2 rounded-lg border transition-colors ${
                          exportFormat === 'csv'
                            ? 'bg-blue-50 border-blue-200 text-blue-700 dark:bg-blue-900/20 dark:border-blue-800 dark:text-blue-400'
                            : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-50 dark:bg-gray-800 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700'
                        }`}
                      >
                        <FileText className="h-4 w-4" />
                        CSV
                      </button>
                      <button
                        onClick={() => setExportFormat('json')}
                        className={`flex items-center justify-center gap-2 px-3 py-2 rounded-lg border transition-colors ${
                          exportFormat === 'json'
                            ? 'bg-blue-50 border-blue-200 text-blue-700 dark:bg-blue-900/20 dark:border-blue-800 dark:text-blue-400'
                            : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-50 dark:bg-gray-800 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700'
                        }`}
                      >
                        <FileJson className="h-4 w-4" />
                        JSON
                      </button>
                      <button
                        onClick={() => setExportFormat('excel')}
                        className={`flex items-center justify-center gap-2 px-3 py-2 rounded-lg border transition-colors ${
                          exportFormat === 'excel'
                            ? 'bg-blue-50 border-blue-200 text-blue-700 dark:bg-blue-900/20 dark:border-blue-800 dark:text-blue-400'
                            : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-50 dark:bg-gray-800 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700'
                        }`}
                      >
                        <FileSpreadsheet className="h-4 w-4" />
                        Excel
                      </button>
                    </div>
                  </div>
                  
                  {/* Export Button */}
                  <div className="flex gap-2">
                    <button
                      onClick={handleExport}
                      disabled={isExporting}
                      className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      {isExporting ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                          Exporting...
                        </>
                      ) : (
                        <>
                          <Download className="h-4 w-4" />
                          Export Data
                        </>
                      )}
                    </button>
                    <button
                      onClick={() => setShowExportOptions(false)}
                      className="px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Total Blocks</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{formatBlockNumber(totalBlocks)}</p>
            </div>
            <div className="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-xl">
              <Hash className="h-6 w-6 text-blue-600 dark:text-blue-400" />
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Latest Block</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{formatBlockNumber(latestBlock)}</p>
            </div>
            <div className="p-3 bg-green-100 dark:bg-green-900/30 rounded-xl">
              <Clock className="h-6 w-6 text-green-600 dark:text-green-400" />
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Avg Transactions</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{avgTransactions.toFixed(1)}</p>
            </div>
            <div className="p-3 bg-purple-100 dark:bg-purple-900/30 rounded-xl">
              <Users className="h-6 w-6 text-purple-600 dark:text-purple-400" />
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Avg Block Time</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{avgBlockTime}s</p>
            </div>
            <div className="p-3 bg-orange-100 dark:bg-orange-900/30 rounded-xl">
              <Zap className="h-6 w-6 text-orange-600 dark:text-orange-400" />
            </div>
          </div>
        </div>
      </div>

      {/* Search Bar */}
      <form onSubmit={handleSearch} className="relative">
        <div className="relative">
          <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
          <input
            type="text"
            placeholder="Search by block number, hash, or validator..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-12 pr-4 py-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-xl text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
          />
        </div>
      </form>

      {/* Filters Panel */}
      {showFilters && (
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Filters</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Block Range
              </label>
              <select
                value={filters.blockRange}
                onChange={(e) => handleFilterChange('blockRange', e.target.value)}
                className="w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="all-time">All Time</option>
                <option value="last-24h">Last 24 Hours</option>
                <option value="last-7d">Last 7 Days</option>
                <option value="last-30d">Last 30 Days</option>
                <option value="last-90d">Last 90 Days</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Validator
              </label>
              <input
                type="text"
                placeholder="0xvalidator..."
                value={filters.validator}
                onChange={(e) => handleFilterChange('validator', e.target.value)}
                className="w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white placeholder-gray-500 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Min Transactions
              </label>
              <input
                type="number"
                min="0"
                value={filters.minTransactions}
                onChange={(e) => handleFilterChange('minTransactions', parseInt(e.target.value) || 0)}
                className="w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Max Transactions
              </label>
              <input
                type="number"
                min="0"
                value={filters.maxTransactions === Infinity ? '' : filters.maxTransactions}
                onChange={(e) => handleFilterChange('maxTransactions', e.target.value === '' ? Infinity : parseInt(e.target.value) || 0)}
                placeholder="∞"
                className="w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white placeholder-gray-500 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Min Gas Used (M)
              </label>
              <input
                type="number"
                min="0"
                step="0.1"
                value={filters.minGasUsed / 1000000}
                onChange={(e) => handleFilterChange('minGasUsed', (parseFloat(e.target.value) || 0) * 1000000)}
                className="w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Max Gas Used (M)
              </label>
              <input
                type="number"
                min="0"
                step="0.1"
                value={filters.maxGasUsed === Infinity ? '' : filters.maxGasUsed / 1000000}
                onChange={(e) => handleFilterChange('maxGasUsed', e.target.value === '' ? Infinity : (parseFloat(e.target.value) || 0) * 1000000)}
                placeholder="∞"
                className="w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white placeholder-gray-500 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>
        </div>
      )}

      {/* Blocks Table */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              Showing {((currentPage - 1) * itemsPerPage) + 1} - {Math.min(currentPage * itemsPerPage, totalBlocks)} of {totalBlocks} blocks
            </h3>
            <div className="text-sm text-gray-500 dark:text-gray-400">
              Page: {currentPage} of {totalPages}
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 dark:bg-gray-700">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Block
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Hash
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Age
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Transactions
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Gas Used
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Miner
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
              {isLoading ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
                    <p className="text-gray-500 dark:text-gray-400">Loading blocks...</p>
                  </td>
                </tr>
              ) : blocks.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-gray-500 dark:text-gray-400">
                    {isLoading ? 'Loading blocks...' : 'No blocks found matching your criteria'}
                  </td>
                </tr>
              ) : (
                blocks.map((block) => (
                  <tr key={block.id} className="hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="text-sm font-medium text-gray-900 dark:text-white">
                          {formatBlockNumber(block.number)}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <Hash className="h-4 w-4 text-gray-400 mr-2" />
                        <span className="text-sm text-gray-900 dark:text-white font-mono">
                          {formatHash(block.hash)}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                      {block.timestamp ? formatTimestamp(block.timestamp) : 'Unknown'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                      {block.transactions.toLocaleString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                      {formatGasUsed(block.gasUsed)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white font-mono">
                      {formatAddress(block.miner)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <button
                        onClick={() => window.open(`https://etherscan.io/block/${block.number}`, '_blank')}
                        className="text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300 flex items-center gap-1"
                      >
                        <ExternalLink className="h-4 w-4" />
                        View
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
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
            <ChevronLeft className="h-4 w-4" />
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
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      )}
    </div>
  );
}
