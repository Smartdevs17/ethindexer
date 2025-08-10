"use client";

import React from 'react';
import { useEthIndexer } from '../../hooks/ethindexer/useEthIndexer';

interface UserFocusedLayoutProps {
  children: React.ReactNode;
}

export const UserFocusedLayout: React.FC<UserFocusedLayoutProps> = ({ children }) => {
  // Get real data from your existing hook
  const { 
    jobs, 
    transfers, 
    debugInfo 
  } = useEthIndexer();

  // Get APIs with URLs from jobs that have them
  const userAPIs = jobs
    .filter(job => job.apiUrl && job.status === 'completed')
    .map(job => ({
      id: job.jobId,
      title: `${job.jobId.slice(0, 8)}... API`,
      description: `Generated from: ${job.message?.slice(0, 60)}...`,
      url: job.apiUrl,
      query: job.message || 'Unknown query',
      status: 'ready',
      createdAt: job.timestamp,
      requests: 0, // You can add this to your Job interface later
      lastUsed: 'Recently'
    }));

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Main Content */}
      <main className="p-6">
        {/* Pass APIs data to children via React context or props */}
        {React.cloneElement(children as React.ReactElement, { 
          userAPIs,
          transfers,
          jobs
        } as any)}
      </main>
    </div>
  );
};