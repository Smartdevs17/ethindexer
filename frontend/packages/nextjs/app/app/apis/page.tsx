"use client";

import React, { useState } from 'react';
import { Copy, ExternalLink, Check, Link as LinkIcon } from 'lucide-react';

interface API {
  id: string;
  title: string;
  description: string;
  url: string;
  query: string;
  status: string;
  createdAt: Date;
  requests: number;
  lastUsed: string;
}

interface MyAPIsPageProps {
  userAPIs?: API[];
}

export default function MyAPIsPage({ userAPIs = [] }: MyAPIsPageProps) {
  const [copiedUrl, setCopiedUrl] = useState<string | null>(null);
  
  const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3001';

  const copyApiUrl = async (url: string) => {
    try {
      await navigator.clipboard.writeText(`${backendUrl}${url}`);
      setCopiedUrl(url);
      setTimeout(() => setCopiedUrl(null), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const testApi = (url: string) => {
    window.open(`${backendUrl}${url}`, '_blank');
  };

  if (userAPIs.length === 0) {
    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">Your APIs</h2>
          <p className="text-gray-600 dark:text-gray-300">Generated endpoints ready to use</p>
        </div>
        
        <div className="text-center py-16 bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700">
          <LinkIcon className="h-16 w-16 text-gray-400 dark:text-gray-500 mx-auto mb-4" />
          <h3 className="text-xl font-medium text-gray-900 dark:text-white mb-2">No APIs yet</h3>
          <p className="text-gray-600 dark:text-gray-300 mb-6">Create your first API endpoint to get started</p>
          <a
            href="/app/query"
            className="inline-flex items-center px-6 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors"
          >
            Create Your First API
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-bold text-gray-900 dark:text-white">Your APIs</h2>
          <p className="text-gray-600 dark:text-gray-300">Generated endpoints ready to use</p>
        </div>
        <div className="text-sm text-gray-500 dark:text-gray-400">
          {userAPIs.length} endpoint{userAPIs.length !== 1 ? 's' : ''} created
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
                      Ready
                    </span>
                  </div>
                  <p className="text-gray-600 dark:text-gray-300 mb-3">{api.description}</p>
                  <div className="text-sm text-gray-500 dark:text-gray-400">
                    Created {api.createdAt instanceof Date ? api.createdAt.toLocaleDateString() : new Date(api.createdAt).toLocaleDateString()} • Last used {api.lastUsed}
                  </div>
                </div>
              </div>
              
              {/* API URL Section */}
              <div className="bg-gray-50 dark:bg-gray-700 rounded-xl p-4 mb-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">API Endpoint</span>
                  <div className="flex gap-2">
                    <button
                      onClick={() => copyApiUrl(api.url)}
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
                      onClick={() => testApi(api.url)}
                      className="flex items-center gap-1 px-3 py-1 bg-gray-600 text-white text-sm rounded-lg hover:bg-gray-700 transition-colors"
                    >
                      <ExternalLink className="h-3 w-3" />
                      Test
                    </button>
                  </div>
                </div>
                <div className="bg-white dark:bg-gray-600 rounded-lg p-3 border border-gray-200 dark:border-gray-500">
                  <code className="text-sm font-mono text-gray-800 dark:text-gray-200 break-all">
                    {backendUrl}{api.url}
                  </code>
                </div>
              </div>
              
              {/* Query Information */}
              <div className="bg-blue-50 dark:bg-blue-900/20 rounded-xl p-4 mb-4">
                <h4 className="text-sm font-medium text-blue-900 dark:text-blue-100 mb-2">Original Query</h4>
                <p className="text-sm text-blue-800 dark:text-blue-200">"{api.query}"</p>
              </div>
              
              {/* Usage Examples */}
              <div className="grid md:grid-cols-3 gap-4">
                <div className="bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg p-3">
                  <div className="text-xs font-medium text-gray-600 dark:text-gray-300 mb-2">JavaScript</div>
                  <code className="text-xs text-gray-800 dark:text-gray-200 block overflow-x-auto">
                    fetch('{backendUrl}{api.url}')
                  </code>
                </div>
                <div className="bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg p-3">
                  <div className="text-xs font-medium text-gray-600 dark:text-gray-300 mb-2">Python</div>
                  <code className="text-xs text-gray-800 dark:text-gray-200 block overflow-x-auto">
                    requests.get('{backendUrl}{api.url}')
                  </code>
                </div>
                <div className="bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg p-3">
                  <div className="text-xs font-medium text-gray-600 dark:text-gray-300 mb-2">cURL</div>
                  <code className="text-xs text-gray-800 dark:text-gray-200 block overflow-x-auto">
                    curl {backendUrl}{api.url}
                  </code>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}