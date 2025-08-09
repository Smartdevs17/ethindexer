import React, { useState, useEffect, useRef } from 'react';
import { Search, TrendingUp, Coins } from 'lucide-react';

export interface TokenInfo {
  address: string;
  symbol: string;
  name: string;
  decimals: number;
  logoUri?: string;
  isPopular?: boolean;
  tags?: string[];
}

interface TokenAutocompleteProps {
  onTokenSelect: (token: TokenInfo) => void;
  onQueryChange?: (query: string) => void;
  placeholder?: string;
  className?: string;
}

export const TokenAutocomplete: React.FC<TokenAutocompleteProps> = ({
  onTokenSelect,
  onQueryChange,
  placeholder = "Search tokens (USDC, WETH, etc.)",
  className = ""
}) => {
  const [query, setQuery] = useState('');
  const [tokens, setTokens] = useState<TokenInfo[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

  // Search tokens API call
  const searchTokens = async (searchQuery: string) => {
    if (searchQuery.length === 0) {
      // Load popular tokens when empty
      try {
        const response = await fetch(`${apiUrl}/tokens/popular?limit=8`);
        const data = await response.json();
        return data.success ? data.tokens : [];
      } catch (error) {
        console.error('Failed to load popular tokens:', error);
        return [];
      }
    }

    try {
      setIsLoading(true);
      const response = await fetch(`${apiUrl}/tokens/search?q=${encodeURIComponent(searchQuery)}&limit=10`);
      const data = await response.json();
      
      if (data.success) {
        return data.tokens;
      } else {
        console.error('Token search failed:', data.error);
        return [];
      }
    } catch (error) {
      console.error('Token search error:', error);
      return [];
    } finally {
      setIsLoading(false);
    }
  };

  // Debounced search effect
  useEffect(() => {
    const timeoutId = setTimeout(async () => {
      const results = await searchTokens(query);
      setTokens(results);
      setSelectedIndex(-1);
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [query]);

  // Load popular tokens on mount
  useEffect(() => {
    searchTokens('').then(setTokens);
  }, []);

  // Handle input change
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setQuery(value);
    setIsOpen(true);
    onQueryChange?.(value);
  };

  // Handle token selection
  const handleTokenSelect = (token: TokenInfo) => {
    setQuery(`${token.symbol} - ${token.name}`);
    setIsOpen(false);
    setSelectedIndex(-1);
    onTokenSelect(token);
  };

  // Handle keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen || tokens.length === 0) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex(prev => (prev + 1) % tokens.length);
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex(prev => prev <= 0 ? tokens.length - 1 : prev - 1);
        break;
      case 'Enter':
        e.preventDefault();
        if (selectedIndex >= 0 && selectedIndex < tokens.length) {
          handleTokenSelect(tokens[selectedIndex]);
        }
        break;
      case 'Escape':
        setIsOpen(false);
        setSelectedIndex(-1);
        break;
    }
  };

  // Handle click outside to close
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node) &&
        !inputRef.current?.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className={`relative ${className}`}>
      {/* Search Input */}
      <div className="relative">
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          onFocus={() => setIsOpen(true)}
          placeholder={placeholder}
          className="w-full pl-10 pr-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
        />
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
        
        {isLoading && (
          <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
            <div className="w-4 h-4 border-2 border-gray-300 dark:border-gray-600 border-t-blue-500 rounded-full animate-spin"></div>
          </div>
        )}
      </div>

      {/* Dropdown */}
      {isOpen && (
        <div
          ref={dropdownRef}
          className="absolute z-50 w-full mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg max-h-60 overflow-y-auto"
        >
          {tokens.length === 0 && !isLoading ? (
            <div className="px-4 py-3 text-gray-500 dark:text-gray-400 text-sm text-center">
              {query ? 'No tokens found' : 'Loading popular tokens...'}
            </div>
          ) : (
            <>
              {query === '' && (
                <div className="px-3 py-2 border-b border-gray-200 dark:border-gray-700">
                  <div className="flex items-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                    <TrendingUp className="w-3 h-3 mr-1" />
                    Popular Tokens
                  </div>
                </div>
              )}
              
              {tokens.map((token, index) => (
                <button
                  key={token.address}
                  onClick={() => handleTokenSelect(token)}
                  className={`w-full px-4 py-3 text-left hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors border-none ${
                    index === selectedIndex ? 'bg-blue-50 dark:bg-blue-900/20' : ''
                  }`}
                >
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-r from-blue-500 to-purple-500 flex items-center justify-center">
                      <Coins className="w-4 h-4 text-white" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center space-x-2">
                        <span className="font-medium text-gray-900 dark:text-white">
                          {token.symbol}
                        </span>
                        {token.isPopular && (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                            Popular
                          </span>
                        )}
                      </div>
                      <div className="text-sm text-gray-500 dark:text-gray-400 truncate">
                        {token.name}
                      </div>
                      <div className="text-xs text-gray-400 dark:text-gray-500 truncate">
                        {token.address.slice(0, 8)}...{token.address.slice(-6)}
                      </div>
                    </div>
                  </div>
                  
                  {token.tags && token.tags.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1">
                      {token.tags.slice(0, 3).map((tag) => (
                        <span
                          key={tag}
                          className="inline-flex items-center px-2 py-0.5 rounded text-xs bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}
                </button>
              ))}
            </>
          )}
        </div>
      )}
    </div>
  );
};

