"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { BarChart3, TrendingUp, Activity, RefreshCw } from 'lucide-react';
import { useEthIndexer } from '../../../hooks/ethindexer/useEthIndexer';

interface LiveDataStats {
  totalTransfers: number;
  activeAPIs: number;
  dataVolume: string;
  uptime: string;
  activeJobs: number;
  completedJobs: number;
  totalTokens: number;
}

export default function LiveDataPage() {
  const { transfers, fetchLiveDataStats } = useEthIndexer();
  const [stats, setStats] = useState<LiveDataStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [lastFetch, setLastFetch] = useState(0);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  // Memoize the load function to prevent unnecessary re-renders
  const loadLiveData = useCallback(async () => {
    const now = Date.now();
    // Prevent multiple requests within 5 seconds
    if (now - lastFetch < 5000) {
      return;
    }
    
    setIsLoading(true);
    setLastFetch(now);
    
    try {
      const liveStats = await fetchLiveDataStats();
      if (liveStats) {
        setStats(liveStats);
        setLastUpdated(new Date());
      }
    } catch (error) {
      console.error('Failed to load live data:', error);
    } finally {
      setIsLoading(false);
    }
  }, [fetchLiveDataStats, lastFetch]);

  // Load data only once on mount
  useEffect(() => {
    loadLiveData();
  }, []); // Empty dependency array - only run on mount

  // Refresh data every 30 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      loadLiveData();
    }, 30000); // 30 seconds

    return () => clearInterval(interval);
  }, [loadLiveData]);

  const handleManualRefresh = () => {
    loadLiveData();
  };

  if (isLoading && !stats) {
    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">Live Blockchain Data</h2>
          <p className="text-gray-600 dark:text-gray-300">Real-time insights from your indexed data</p>
        </div>
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <span className="ml-3 text-gray-600 dark:text-gray-300">Loading live data...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-start">
        <div>
          <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">Live Blockchain Data</h2>
          <p className="text-gray-600 dark:text-gray-300">Real-time insights from your indexed data</p>
          {lastUpdated && (
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              Last updated: {lastUpdated.toLocaleTimeString()}
            </p>
          )}
        </div>
        <button
          onClick={handleManualRefresh}
          disabled={isLoading}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
            isLoading
              ? 'bg-gray-100 dark:bg-gray-700 text-gray-400 cursor-not-allowed'
              : 'bg-blue-600 hover:bg-blue-700 text-white'
          }`}
        >
          <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
          {isLoading ? 'Refreshing...' : 'Refresh'}
        </button>
      </div>
      
      {/* Stats Grid */}
      <div className="grid lg:grid-cols-4 gap-6">
        <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between mb-2">
            <h3 className="font-semibold text-gray-900 dark:text-white">Total Transfers</h3>
            <TrendingUp className="h-5 w-5 text-blue-600" />
          </div>
          <p className="text-3xl font-bold text-blue-600 mb-1">{stats?.totalTransfers?.toLocaleString() || '0'}</p>
          <p className="text-sm text-gray-500 dark:text-gray-400">Real-time data</p>
        </div>
        
        <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between mb-2">
            <h3 className="font-semibold text-gray-900 dark:text-white">Active APIs</h3>
            <BarChart3 className="h-5 w-5 text-green-600" />
          </div>
          <p className="text-3xl font-bold text-green-600 mb-1">{stats?.activeAPIs || '0'}</p>
          <p className="text-sm text-gray-500 dark:text-gray-400">Endpoints ready</p>
        </div>
        
        <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between mb-2">
            <h3 className="font-semibold text-gray-900 dark:text-white">Data Volume</h3>
            <Activity className="h-5 w-5 text-purple-600" />
          </div>
          <p className="text-3xl font-bold text-purple-600 mb-1">{stats?.dataVolume || '0GB'}</p>
          <p className="text-sm text-gray-500 dark:text-gray-400">Indexed total</p>
        </div>
        
        <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between mb-2">
            <h3 className="font-semibold text-gray-900 dark:text-white">Uptime</h3>
            <div className="w-2 h-2 bg-green-500 rounded-full"></div>
          </div>
          <p className="text-3xl font-bold text-green-600 mb-1">{stats?.uptime || '99.9%'}</p>
          <p className="text-sm text-gray-500 dark:text-gray-400">Last 30 days</p>
        </div>
      </div>

      {/* Additional Stats */}
      <div className="grid lg:grid-cols-3 gap-6">
        <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between mb-2">
            <h3 className="font-semibold text-gray-900 dark:text-white">Active Jobs</h3>
            <div className="w-2 h-2 bg-yellow-500 rounded-full animate-pulse"></div>
          </div>
          <p className="text-3xl font-bold text-yellow-600 mb-1">{stats?.activeJobs || '0'}</p>
          <p className="text-sm text-gray-500 dark:text-gray-400">Currently processing</p>
        </div>
        
        <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between mb-2">
            <h3 className="font-semibold text-gray-900 dark:text-white">Completed Jobs</h3>
            <div className="w-2 h-2 bg-green-500 rounded-full"></div>
          </div>
          <p className="text-3xl font-bold text-green-600 mb-1">{stats?.completedJobs || '0'}</p>
          <p className="text-sm text-gray-500 dark:text-gray-400">Successfully finished</p>
        </div>
        
        <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between mb-2">
            <h3 className="font-semibold text-gray-900 dark:text-white">Total Tokens</h3>
            <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
          </div>
          <p className="text-3xl font-bold text-blue-600 mb-1">{stats?.totalTokens || '0'}</p>
          <p className="text-sm text-gray-500 dark:text-gray-400">Tracked tokens</p>
        </div>
      </div>
      
      {/* Recent Activity */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700">
        <div className="p-6 border-b border-gray-200 dark:border-gray-700">
          <h3 className="text-xl font-semibold text-gray-900 dark:text-white">Recent Transfers</h3>
          <p className="text-gray-600 dark:text-gray-300 text-sm">Live blockchain activity from your APIs</p>
        </div>
        
        <div className="p-6">
          {transfers && transfers.length > 0 ? (
            <div className="space-y-3">
              {transfers.slice(0, 10).map((transfer, index) => (
                <div key={index} className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                  <div className="flex items-center gap-4">
                    <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-gray-900 dark:text-white">{transfer.token?.symbol || 'Token'}</span>
                        <span className="text-gray-500 dark:text-gray-400">•</span>
                        <span className="text-sm text-gray-600 dark:text-gray-300">
                          Block {transfer.blockNumber}
                        </span>
                      </div>
                      <div className="text-sm text-gray-500 dark:text-gray-400 font-mono">
                        {transfer.from?.slice(0, 8)}...{transfer.from?.slice(-4)} → {transfer.to?.slice(0, 8)}...{transfer.to?.slice(-4)}
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-semibold text-gray-900 dark:text-white">{transfer.value}</div>
                    <div className="text-sm text-gray-500 dark:text-gray-400">
                      {transfer.timestamp instanceof Date 
                        ? transfer.timestamp.toLocaleTimeString() 
                        : new Date(transfer.timestamp).toLocaleTimeString()
                      }
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <Activity className="h-12 w-12 text-gray-400 dark:text-gray-500 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">No transfer data yet</h3>
              <p className="text-gray-500 dark:text-gray-400">Create your first API to start seeing live blockchain data</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}