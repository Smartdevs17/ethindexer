import Link from 'next/link';
import { Database, ArrowRight } from 'lucide-react';

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50">
      {/* Simple Header */}
      <header className="p-6">
        <div className="flex items-center space-x-2">
          <Database className="h-8 w-8 text-blue-600" />
          <span className="text-xl font-bold text-gray-900">EthIndexer</span>
        </div>
      </header>

      {/* Hero Section */}
      <div className="max-w-4xl mx-auto px-6 py-20 text-center">
        <h1 className="text-5xl font-bold text-gray-900 mb-6">
          Turn Natural Language into{' '}
          <span className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
            Blockchain APIs
          </span>
        </h1>
        
        <p className="text-xl text-gray-600 mb-8 max-w-2xl mx-auto">
          Index Ethereum data using plain English. Get instant REST API endpoints powered by AI. 
          No technical knowledge required.
        </p>

        {/* Simple Demo */}
        <div className="bg-white rounded-2xl shadow-xl p-8 mb-8 max-w-3xl mx-auto">
          <div className="text-left">
            <p className="text-gray-600 mb-3">Try saying:</p>
            <div className="bg-gray-50 p-4 rounded-lg mb-4">
              <code className="text-blue-600">"Index USDC transfers from the last 1000 blocks"</code>
            </div>
            <p className="text-gray-600 mb-3">You get:</p>
            <div className="bg-green-50 p-4 rounded-lg border border-green-200">
              <code className="text-green-700">GET /api/usdc-transfers</code>
            </div>
          </div>
        </div>

        {/* Call to Action */}
        <Link 
          href="/dashboard" 
          className="inline-flex items-center gap-2 bg-blue-600 text-white px-8 py-4 rounded-xl text-lg font-semibold hover:bg-blue-700 transition-colors"
        >
          Start Indexing Now
          <ArrowRight className="h-5 w-5" />
        </Link>
      </div>
    </div>
  );
}

export const metadata = {
  title: "EthIndexer - AI-Powered Blockchain Data Indexing",
  description: "Turn natural language into blockchain APIs powered by AI",
};