import React, { useState, useRef, useEffect } from 'react';
import { Send, Lightbulb } from 'lucide-react';
import { TokenAutocomplete, TokenInfo } from './TokenAutocomplete';

interface SmartChatInputProps {
  onSendMessage: (message: string) => void;
  disabled?: boolean;
  placeholder?: string;
}

export const SmartChatInput: React.FC<SmartChatInputProps> = ({
  onSendMessage,
  disabled = false,
  placeholder = "Ask me to index blockchain data..."
}) => {
  const [input, setInput] = useState('');
  const [showTokenPicker, setShowTokenPicker] = useState(false);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [selectedToken, setSelectedToken] = useState<TokenInfo | null>(null);
  
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = textareaRef.current.scrollHeight + 'px';
    }
  }, [input]);

  // Load contextual suggestions
  const loadSuggestions = async (context: string) => {
    try {
      const response = await fetch(`${apiUrl}/tokens/suggestions?context=${encodeURIComponent(context)}`);
      const data = await response.json();
      
      if (data.success) {
        setSuggestions(data.suggestions);
      }
    } catch (error) {
      console.error('Failed to load suggestions:', error);
    }
  };

  // Detect if user is typing token-related query
  useEffect(() => {
    const inputLower = input.toLowerCase();
    const isTokenQuery = inputLower.includes('index') || inputLower.includes('transfer') || inputLower.includes('token');
    
    if (isTokenQuery && input.length > 5) {
      loadSuggestions(input);
    }
  }, [input]);

  const handleSend = () => {
    if (input.trim() && !disabled) {
      onSendMessage(input.trim());
      setInput('');
      setSelectedToken(null);
      setSuggestions([]);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleTokenSelect = (token: TokenInfo) => {
    const tokenText = `${token.symbol} (${token.name})`;
    setInput(prev => {
      // Replace any existing token mention or append
      if (prev.includes('index') || prev.includes('Index')) {
        return prev.replace(/\b[A-Z]{2,5}\b/g, token.symbol);
      }
      return `Index ${token.symbol} transfers`;
    });
    setSelectedToken(token);
    setShowTokenPicker(false);
  };

  const handleSuggestionClick = (suggestion: string) => {
    setInput(suggestion);
    setSuggestions([]);
  };

  return (
    <div className="space-y-3">
      {/* Token Picker Toggle */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => setShowTokenPicker(!showTokenPicker)}
          className="flex items-center space-x-2 text-sm text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 transition-colors"
        >
          <Lightbulb className="w-4 h-4" />
          <span>{showTokenPicker ? 'Hide' : 'Pick'} Token</span>
        </button>
        
        {selectedToken && (
          <div className="flex items-center space-x-2 text-sm text-gray-600 dark:text-gray-400">
            <span>Selected:</span>
            <span className="font-medium text-blue-600 dark:text-blue-400">
              {selectedToken.symbol}
            </span>
          </div>
        )}
      </div>

      {/* Token Autocomplete */}
      {showTokenPicker && (
        <TokenAutocomplete
          onTokenSelect={handleTokenSelect}
          className="mb-3"
        />
      )}

      {/* Smart Suggestions */}
      {suggestions.length > 0 && (
        <div className="space-y-2">
          <div className="text-xs font-medium text-gray-500 dark:text-gray-400 flex items-center">
            <Lightbulb className="w-3 h-3 mr-1" />
            Quick suggestions:
          </div>
          <div className="flex flex-wrap gap-2">
            {suggestions.map((suggestion, index) => (
              <button
                key={index}
                onClick={() => handleSuggestionClick(suggestion)}
                className="px-3 py-1 text-xs bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-300 rounded-full hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-colors"
              >
                {suggestion}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Main Input */}
      <div className="flex items-end space-x-3">
        <div className="flex-1 relative">
          <textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder={placeholder}
            disabled={disabled}
            rows={1}
            className="w-full px-4 py-3 pr-12 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none transition-colors disabled:opacity-50"
          />
        </div>
        
        <button
          onClick={handleSend}
          disabled={!input.trim() || disabled}
          className="p-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          <Send className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};