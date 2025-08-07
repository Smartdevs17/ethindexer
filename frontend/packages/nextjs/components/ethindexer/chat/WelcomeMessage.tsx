import React from "react";

interface QuickAction {
  icon: string;
  title: string;
  description: string;
  query: string;
}

const QUICK_ACTIONS: QuickAction[] = [
  {
    icon: "💰",
    title: "Track USDC Transfers",
    description: "Index all USDC token transfers",
    query: "Index USDC transfers from the latest 1000 blocks",
  },
  {
    icon: "🔍",
    title: "Monitor Address",
    description: "Track transfers for a specific address",
    query: "Track all transfers for address 0x742d35cc44b75c42b4b6c5a8b964b08d2a6f6c42",
  },
  {
    icon: "⚡",
    title: "High Value Transfers",
    description: "Monitor large USDT transfers",
    query: "Index USDT transfers from block 18000000 where value > 100000",
  },
  {
    icon: "📊",
    title: "Block Range Query",
    description: "Index transfers in a specific range",
    query: "Index all transfers from block 18000000 to 18001000",
  },
];

interface WelcomeMessageProps {
  onQuickAction: (query: string) => void;
}

export const WelcomeMessage: React.FC<WelcomeMessageProps> = ({ onQuickAction }) => {
  const handleQuickStart = (template: string) => {
    if (onQuickAction) {
      onQuickAction(template);
    }
  };

  return (
    <div className="text-center py-8 px-6">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Welcome to EthIndexer AI</h2>
        <p className="text-gray-600 dark:text-gray-300">
          I&apos;ll help you create blockchain indexing jobs using natural language. Just describe what you want to index!
        </p>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
        {QUICK_ACTIONS.map((action, index) => (
          <button
            key={index}
            onClick={() => handleQuickStart(action.query)}
            className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors text-left group"
          >
            <div className="flex items-start space-x-3">
              <div className="text-2xl">{action.icon}</div>
              <div>
                <h3 className="font-medium text-gray-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400">
                  {action.title}
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">{action.description}</p>
              </div>
            </div>
          </button>
        ))}
      </div>

      {/* Example Queries */}
      <div className="text-left bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
        <h3 className="font-medium text-gray-900 dark:text-white mb-3">💡 Example queries you can try:</h3>
        <ul className="space-y-2 text-sm text-gray-600 dark:text-gray-300">
          <li className="flex items-start">
            <span className="mr-2">•</span>
            <span>&quot;Index all USDC transfers from the latest 1000 blocks&quot;</span>
          </li>
          <li className="flex items-start">
            <span className="mr-2">•</span>
            <span>&quot;Track WETH transfers for address 0x742d35cc44b75c42b4b6c5a8b964b08d2a6f6c42&quot;</span>
          </li>
          <li className="flex items-start">
            <span className="mr-2">•</span>
            <span>&quot;Monitor USDT transfers above 100,000 from block 18000000&quot;</span>
          </li>
        </ul>
      </div>

      {/* Features */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-8">
        <div className="text-center">
          <div className="text-3xl mb-2">🗣️</div>
          <h4 className="font-medium text-gray-900 dark:text-white mb-1">Natural Language</h4>
          <p className="text-sm text-gray-600 dark:text-gray-300">Describe what you want in plain English</p>
        </div>
        <div className="text-center">
          <div className="text-3xl mb-2">⚡</div>
          <h4 className="font-medium text-gray-900 dark:text-white mb-1">Real-time Indexing</h4>
          <p className="text-sm text-gray-600 dark:text-gray-300">Get live updates as data is indexed</p>
        </div>
        <div className="text-center">
          <div className="text-3xl mb-2">🔌</div>
          <h4 className="font-medium text-gray-900 dark:text-white mb-1">Auto API Generation</h4>
          <p className="text-sm text-gray-600 dark:text-gray-300">APIs are created automatically for your indexed data</p>
        </div>
      </div>
    </div>
  );
};