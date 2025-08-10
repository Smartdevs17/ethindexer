"use client";

import React, { useState } from 'react';
import { Copy, Check, ExternalLink } from 'lucide-react';

interface APIUrlDisplayProps {
  jobId?: string;
  query?: string;
  show: boolean;
  onClose?: () => void;
}

export const APIUrlDisplay: React.FC<APIUrlDisplayProps> = ({ 
  jobId, 
  query, 
  show,
  onClose 
}) => {
  const [copied, setCopied] = useState(false);

  if (!show || !jobId) return null;

  const baseUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3001';
  const apiUrl = `${baseUrl}/api/transfers?jobId=${jobId}`;

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(apiUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const openInNewTab = () => {
    window.open(apiUrl, '_blank');
  };

  return (
    <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-6 mb-4">
      <div className="flex justify-between items-start mb-4">
        <h3 className="text-lg font-semibold text-green-800 dark:text-green-200">
          ✅ API Generated Successfully!
        </h3>
        {onClose && (
          <button 
            onClick={onClose}
            className="text-green-600 hover:text-green-800 dark:text-green-400"
          >
            ✕
          </button>
        )}
      </div>

      {query && (
        <p className="text-sm text-green-700 dark:text-green-300 mb-4">
          <strong>Query:</strong> "{query}"
        </p>
      )}

      <div className="space-y-3">
        <div>
          <p className="text-sm font-medium text-green-800 dark:text-green-200 mb-2">
            Your API Endpoint:
          </p>
          <div className="flex items-center gap-2 p-3 bg-white dark:bg-gray-800 border border-green-200 dark:border-green-700 rounded-lg">
            <code className="flex-1 text-sm font-mono text-gray-800 dark:text-gray-200 break-all">
              {apiUrl}
            </code>
            <button
              onClick={copyToClipboard}
              className="flex items-center gap-1 px-3 py-1 bg-blue-600 text-white rounded text-sm hover:bg-blue-700 transition-colors"
              title="Copy URL"
            >
              {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              {copied ? 'Copied!' : 'Copy'}
            </button>
            <button
              onClick={openInNewTab}
              className="flex items-center gap-1 px-3 py-1 bg-gray-600 text-white rounded text-sm hover:bg-gray-700 transition-colors"
              title="Open in new tab"
            >
              <ExternalLink className="h-4 w-4" />
              Test
            </button>
          </div>
        </div>

        <div className="text-sm text-green-700 dark:text-green-300">
          <p><strong>💡 Usage Examples:</strong></p>
          <div className="mt-2 space-y-1 text-xs font-mono bg-green-100 dark:bg-green-900/40 p-3 rounded">
            <div>curl "{apiUrl}"</div>
            <div>fetch("{apiUrl}").then(r ={'>'} r.json())</div>
          </div>
        </div>

        <div className="text-xs text-green-600 dark:text-green-400">
          <p>🔄 This API will update automatically as new blockchain data is indexed</p>
        </div>
      </div>
    </div>
  );
};