"use client";

import React, { useState } from 'react';
import { Copy, Check, ExternalLink } from 'lucide-react';


interface APIUrlDisplayProps {
  jobId?: string;
  query?: string;
  config?: any;
  show: boolean;
  onClose?: () => void;
}


export const APIUrlDisplay: React.FC<APIUrlDisplayProps> = ({ 
  jobId, 
  query, 
  config,
  show,
  onClose 
}) => {
  const [copied, setCopied] = useState(false);

  if (!show || !jobId) return null;

  const baseUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3001';
  // Generate multiple working API URLs based on your existing endpoints
  const apiUrls = generateWorkingApiUrls(baseUrl, config, query || "");

  const copyToClipboard = async (url: string) => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  return (
    <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-6 mb-4">
      <div className="flex justify-between items-start mb-4">
        <h3 className="text-lg font-semibold text-green-800 dark:text-green-200">
          ✅ Indexing Started! Your APIs are ready:
        </h3>
        {onClose && (
          <button onClick={onClose} className="text-green-600 hover:text-green-800 dark:text-green-400">✕</button>
        )}
      </div>

      {query && (
        <p className="text-sm text-green-700 dark:text-green-300 mb-4">
          <strong>Query:</strong> "{query}"
        </p>
      )}

      <div className="space-y-4">
        {apiUrls.map((api, index) => (
          <div key={index} className="space-y-2">
            <p className="text-sm font-medium text-green-800 dark:text-green-200">
              {api.title}:
            </p>
            <div className="flex items-center gap-2 p-3 bg-white dark:bg-gray-800 border border-green-200 dark:border-green-700 rounded-lg">
              <code className="flex-1 text-sm font-mono text-gray-800 dark:text-gray-200 break-all">
                {api.url}
              </code>
              <button
                onClick={() => copyToClipboard(api.url)}
                className="flex items-center gap-1 px-3 py-1 bg-blue-600 text-white rounded text-sm hover:bg-blue-700 transition-colors"
                title="Copy URL"
              >
                <Copy className="h-4 w-4" />
                Copy
              </button>
              <button
                onClick={() => window.open(api.url, '_blank')}
                className="flex items-center gap-1 px-3 py-1 bg-gray-600 text-white rounded text-sm hover:bg-gray-700 transition-colors"
                title="Test API"
              >
                <ExternalLink className="h-4 w-4" />
                Test
              </button>
            </div>
          </div>
        ))}

        <div className="text-sm text-green-700 dark:text-green-300 mt-4">
          <p><strong>💡 Usage Examples:</strong></p>
          <div className="mt-2 space-y-1 text-xs font-mono bg-green-100 dark:bg-green-900/40 p-3 rounded">
            <div>curl "{apiUrls[0]?.url}"</div>
            <div>{`fetch("${apiUrls[0]?.url}").then(r => r.json())`}</div>
          </div>
        </div>

        <div className="text-xs text-green-600 dark:text-green-400">
          <p>🔄 These APIs are live and update automatically as indexing progresses</p>
        </div>
      </div>
    </div>
  );
};

// HELPER FUNCTION: Generate working API URLs based on your existing endpoints
function generateWorkingApiUrls(baseUrl: string, config: any, query: string) {
  const urls = [];

  // Main transfers endpoint (always works)
  urls.push({
    title: "All Transfers",
    url: `${baseUrl}/api/dynamic/transfers?limit=100`
  });

  // If specific token address was indexed
  if (config?.addresses && config.addresses.length > 0) {
    const address = config.addresses[0];
    urls.push({
      title: "Transfers for this Token",
      url: `${baseUrl}/api/dynamic/transfers?token=${address}&limit=100`
    });
  }

  // If block range was specified
  if (config?.fromBlock) {
    urls.push({
      title: "Transfers from Block Range",
      url: `${baseUrl}/api/dynamic/transfers?fromBlock=${config.fromBlock}&limit=100`
    });
  }

  // Recent transfers using the working endpoint
  urls.push({
    title: "Recent Transfers",
    url: `${baseUrl}/api/dynamic/transfers?limit=50&sortBy=timestamp&sortOrder=DESC`
  });

  return urls;
}