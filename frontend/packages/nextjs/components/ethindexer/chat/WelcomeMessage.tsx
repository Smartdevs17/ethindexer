import React from 'react';

interface WelcomeMessageProps {
  onQuickAction: (action: string) => void;
}

export const WelcomeMessage: React.FC<WelcomeMessageProps> = ({ onQuickAction }) => {
  const quickActions = [
    {
      icon: '💰',
      title: 'Track USDC Transfers',
      description: 'Index all USDC token transfers',
      action: 'Index USDC transfers from the latest 1000 blocks'
    },
    {
      icon: '🔍',
      title: 'Monitor Address',
      description: 'Track transfers for a specific address',
      action: 'Track all transfers for address 0x742d35cc44b75c42b4b6c5a8b964b08d2a6f6c42'
    },
    {
      icon: '⚡',
      title: 'High Value Transfers',
      description: 'Monitor large USDT transfers',
      action: 'Index USDT transfers from block 18000000 where value > 100000'
    },
    {
      icon: '📊',
      title: 'Block Range Query',
      description: 'Index transfers in a specific range',
      action: 'Index all transfers from block 18000000 to 18001000'
    }
  ];

  const examples = [
    '"I want to track USDC transfers"',
    '"Monitor WETH transfers for the last 1000 blocks"',
    '"Index transfers for address 0x123..."',
    '"Track USDT transfers above $10,000"'
  ];

  return (
    <div className="flex flex-col items-center justify-center text-center py-8 space-y-6">
      {/* Welcome Header */}
      <div className="space-y-2">
        <div className="w-16 h-16 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center mx-auto">
          <span className="text-2xl">🤖</span>
        </div>
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
          Welcome to EthIndexer AI
        </h2>
        <p className="text-gray-600 dark:text-gray-400 max-w-md">
          I'll help you index blockchain data using natural language. Just tell me what you want to track!
        </p>
      </div>

      {/* Quick Action Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full max-w-2xl">
        {quickActions.map((action, index) => (
          <button
            key={index}
            onClick={() => onQuickAction(action.action)}
            className="text-left p-4 border border-gray-200 dark:border-gray-700 rounded-lg hover:border-blue-300 dark:hover:border-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-all duration-200 group"
          >
            <div className="flex items-start space-x-3">
              <div className="text-2xl group-hover:scale-110 transition-transform">
                {action.icon}
              </div>
              <div className="flex-1">
                <h3 className="font-medium text-gray-900 dark:text-white mb-1">
                  {action.title}
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {action.description}
                </p>
              </div>
            </div>
          </button>
        ))}
      </div>

      {/* Example Queries */}
      <div className="space-y-3 w-full max-w-lg">
        <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300">
          💡 Example queries you can try:
        </h3>
        <div className="space-y-2">
          {examples.map((example, index) => (
            <button
              key={index}
              onClick={() => onQuickAction(example.replace(/"/g, ''))}
              className="block w-full text-left px-3 py-2 text-sm bg-gray-50 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            >
              {example}
            </button>
          ))}
        </div>
      </div>

      {/* Features Highlight */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 w-full max-w-xl text-center">
        <div className="space-y-1">
          <div className="text-lg">🗣️</div>
          <div className="text-xs text-gray-600 dark:text-gray-400">
            Natural Language
          </div>
        </div>
        <div className="space-y-1">
          <div className="text-lg">⚡</div>
          <div className="text-xs text-gray-600 dark:text-gray-400">
            Real-time Indexing
          </div>
        </div>
        <div className="space-y-1">
          <div className="text-lg">🔗</div>
          <div className="text-xs text-gray-600 dark:text-gray-400">
            Auto API Generation
          </div>
        </div>
      </div>
    </div>
  );
};