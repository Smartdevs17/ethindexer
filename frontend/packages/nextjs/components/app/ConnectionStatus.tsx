"use client";

import React from 'react';
import { Wifi, WifiOff, AlertCircle, CheckCircle, Clock } from 'lucide-react';
import { useAccount } from 'wagmi';
import { useEthIndexer } from '../../hooks/ethindexer/useEthIndexer';

interface ConnectionStatusProps {
  className?: string;
}

export const ConnectionStatus: React.FC<ConnectionStatusProps> = ({ className = '' }) => {
  const { isConnected: isWalletConnected } = useAccount();
  const { 
    isConnected: isBackendConnected, 
    isAuthenticated, 
    connectedClients,
    systemStatus 
  } = useEthIndexer();

  const getConnectionStatus = () => {
    if (!isWalletConnected) {
      return {
        status: 'disconnected',
        icon: WifiOff,
        color: 'text-red-600',
        bgColor: 'bg-red-50 dark:bg-red-900/20',
        borderColor: 'border-red-200 dark:border-red-800',
        message: 'Wallet not connected'
      };
    }

    if (!isBackendConnected) {
      return {
        status: 'connecting',
        icon: Clock,
        color: 'text-yellow-600',
        bgColor: 'bg-yellow-50 dark:bg-yellow-900/20',
        borderColor: 'border-yellow-200 dark:border-yellow-800',
        message: 'Connecting to backend...'
      };
    }

    if (!isAuthenticated) {
      return {
        status: 'authenticating',
        icon: Clock,
        color: 'text-blue-600',
        bgColor: 'bg-blue-50 dark:bg-blue-900/20',
        borderColor: 'border-blue-200 dark:border-blue-800',
        message: 'Authenticating...'
      };
    }

    return {
      status: 'connected',
      icon: CheckCircle,
      color: 'text-green-600',
      bgColor: 'bg-green-50 dark:bg-green-900/20',
      borderColor: 'border-green-200 dark:border-green-800',
      message: 'Connected & Ready'
    };
  };

  const connectionInfo = getConnectionStatus();
  const Icon = connectionInfo.icon;

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <div className={`flex items-center gap-2 px-3 py-2 rounded-lg border ${connectionInfo.bgColor} ${connectionInfo.borderColor}`}>
        <Icon className={`h-4 w-4 ${connectionInfo.color}`} />
        <span className={`text-sm font-medium ${connectionInfo.color}`}>
          {connectionInfo.message}
        </span>
        {isBackendConnected && connectedClients > 0 && (
          <span className="text-xs text-gray-500 dark:text-gray-400">
            • {connectedClients} clients
          </span>
        )}
      </div>
      
      {systemStatus && (
        <div className="flex items-center gap-2 px-3 py-2 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
          <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
          <span className="text-sm text-blue-700 dark:text-blue-300">
            {systemStatus}
          </span>
        </div>
      )}
    </div>
  );
};


