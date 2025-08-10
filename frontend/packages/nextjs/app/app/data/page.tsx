"use client";

import React from 'react';
import { BarChart3, TrendingUp, Activity } from 'lucide-react';
import { useEthIndexer } from '../../../hooks/ethindexer/useEthIndexer';

export default function LiveDataPage() {
  const { transfers, jobs } = useEthIndexer();

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">Live Blockchain Data</h2>
        <p className="text-gray-600 dark:text-gray-300">Real-time insights from your indexed data</p>
      </div>
      
      {/* Stats Grid */}
      <div className="grid lg:grid-cols-4 gap-6">
        <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between mb-2">
            <h3 className="font-semibold text-gray-900 dark:text-white">Total Transfers</h3>
            <TrendingUp className="h-5 w-5 text-blue-600" />
          </div>
          <p className="text-3xl font-bold text-blue-600 mb-1">{transfers?.length?.toLocaleString() || '0'}</p>
          <p className="text-sm text-gray-500 dark:text-gray-400">Real-time data</p>
        </div>
        
        <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between mb-2">
            <h3 className="font-semibold text-gray-900 dark:text-white">Active APIs</h3>
            <BarChart3 className="h-5 w-5 text-green-600" />
          </div>
          <p className="text-3xl font-bold text-green-600 mb-1">{jobs?.length || '0'}</p>
          <p className="text-sm text-gray-500 dark:text-gray-400">Endpoints ready</p>
        </div>
        
        <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between mb-2">
            <h3 className="font-semibold text-gray-900 dark:text-white">Data Volume</h3>
            <Activity className="h-5 w-5 text-purple-600" />
          </div>
          <p className="text-3xl font-bold text-purple-600 mb-1">2.4TB</p>
          <p className="text-sm text-gray-500 dark:text-gray-400">Indexed total</p>
        </div>
        
        <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between mb-2">
            <h3 className="font-semibold text-gray-900 dark:text-white">Uptime</h3>
            <div className="w-2 h-2 bg-green-500 rounded-full"></div>
          </div>
          <p className="text-3xl font-bold text-green-600 mb-1">99.9%</p>
          <p className="text-sm text-gray-500 dark:text-gray-400">Last 30 days</p>
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
      
      {/* Data Explorer Coming Soon */}
      <div className="bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 rounded-2xl border border-blue-200 dark:border-blue-800 p-8">
        <div className="text-center">
          <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">Advanced Data Explorer</h3>
          <p className="text-gray-600 dark:text-gray-300 mb-4">
            Interactive charts, filtering, and export tools coming soon
          </p>
          <div className="flex justify-center space-x-4 text-sm text-gray-500 dark:text-gray-400">
            <span>• Time-series charts</span>
            <span>• Advanced filtering</span>
            <span>• CSV/JSON export</span>
            <span>• Custom dashboards</span>
          </div>
        </div>
      </div>
    </div>
  );
}