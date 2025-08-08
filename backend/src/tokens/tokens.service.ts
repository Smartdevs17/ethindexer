import { Injectable, Logger } from '@nestjs/common';

export interface TokenInfo {
  address: string;
  symbol: string;
  name: string;
  decimals: number;
  logoUri?: string;
  isPopular?: boolean;
  marketCap?: number;
  tags?: string[];
}

@Injectable()
export class TokensService {
  private readonly logger = new Logger(TokensService.name);
  
  // Popular Ethereum tokens database
  private readonly popularTokens: TokenInfo[] = [
    {
      address: '0xA0b86a33E6441e67a98b28E4Bd2b2a6a8C0BF5E1',
      symbol: 'USDC',
      name: 'USD Coin',
      decimals: 6,
      isPopular: true,
      tags: ['stablecoin', 'defi', 'payments']
    },
    {
      address: '0xdAC17F958D2ee523a2206206994597C13D831ec7',
      symbol: 'USDT',
      name: 'Tether USD',
      decimals: 6,
      isPopular: true,
      tags: ['stablecoin', 'payments']
    },
    {
      address: '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2',
      symbol: 'WETH',
      name: 'Wrapped Ether',
      decimals: 18,
      isPopular: true,
      tags: ['wrapped', 'defi']
    },
    {
      address: '0x6B175474E89094C44Da98b954EedeAC495271d0F',
      symbol: 'DAI',
      name: 'Dai Stablecoin',
      decimals: 18,
      isPopular: true,
      tags: ['stablecoin', 'defi', 'makerdao']
    },
    {
      address: '0x514910771AF9Ca656af840dff83E8264EcF986CA',
      symbol: 'LINK',
      name: 'ChainLink Token',
      decimals: 18,
      isPopular: true,
      tags: ['oracle', 'defi']
    },
    {
      address: '0x1f9840a85d5aF5bf1D1762F925BDADdC4201F984',
      symbol: 'UNI',
      name: 'Uniswap',
      decimals: 18,
      isPopular: true,
      tags: ['governance', 'dex', 'defi']
    },
    {
      address: '0x7D1AfA7B718fb893dB30A3aBc0Cfc608AaCfeBB0',
      symbol: 'MATIC',
      name: 'Polygon',
      decimals: 18,
      isPopular: true,
      tags: ['layer2', 'scaling']
    },
    {
      address: '0xA0b86a33E6441e67a98b28E4Bd2b2a6a8C0BF5E1',
      symbol: 'SHIB',
      name: 'SHIBA INU',
      decimals: 18,
      isPopular: true,
      tags: ['meme', 'community']
    },
    {
      address: '0x95aD61b0a150d79219dCF64E1E6Cc01f0B64C4cE',
      symbol: 'SHIB',
      name: 'SHIBA INU',
      decimals: 18,
      isPopular: true,
      tags: ['meme', 'community']
    }
  ];

  /**
   * Search tokens by symbol, name, or address
   */
  async searchTokens(query: string, limit: number = 10): Promise<TokenInfo[]> {
    if (!query || query.length < 1) {
      return this.popularTokens.slice(0, limit);
    }

    const queryLower = query.toLowerCase();
    
    // Filter tokens based on search query
    const results = this.popularTokens.filter(token => {
      return (
        token.symbol.toLowerCase().includes(queryLower) ||
        token.name.toLowerCase().includes(queryLower) ||
        token.address.toLowerCase().includes(queryLower) ||
        token.tags?.some(tag => tag.toLowerCase().includes(queryLower))
      );
    });

    // Sort by relevance (exact matches first, then partial matches)
    results.sort((a, b) => {
      const aSymbolExact = a.symbol.toLowerCase() === queryLower ? 1 : 0;
      const bSymbolExact = b.symbol.toLowerCase() === queryLower ? 1 : 0;
      
      if (aSymbolExact !== bSymbolExact) {
        return bSymbolExact - aSymbolExact;
      }
      
      const aNameExact = a.name.toLowerCase() === queryLower ? 1 : 0;
      const bNameExact = b.name.toLowerCase() === queryLower ? 1 : 0;
      
      if (aNameExact !== bNameExact) {
        return bNameExact - aNameExact;
      }
      
      // Sort by popularity
      const aPopular = a.isPopular ? 1 : 0;
      const bPopular = b.isPopular ? 1 : 0;
      
      return bPopular - aPopular;
    });

    return results.slice(0, limit);
  }

  /**
   * Get token info by address
   */
  async getTokenByAddress(address: string): Promise<TokenInfo | null> {
    const token = this.popularTokens.find(
      t => t.address.toLowerCase() === address.toLowerCase()
    );
    return token || null;
  }

  /**
   * Get popular tokens for suggestions
   */
  async getPopularTokens(limit: number = 8): Promise<TokenInfo[]> {
    return this.popularTokens
      .filter(token => token.isPopular)
      .slice(0, limit);
  }

  /**
   * Validate if address looks like a valid Ethereum address
   */
  isValidAddress(address: string): boolean {
    return /^0x[a-fA-F0-9]{40}$/.test(address);
  }

  /**
   * Get token suggestions based on context
   */
  async getContextualSuggestions(context: string): Promise<string[]> {
    const suggestions: string[] = [];
    const contextLower = context.toLowerCase();

    // Context-based suggestions
    if (contextLower.includes('stable') || contextLower.includes('usd')) {
      suggestions.push('USDC transfers', 'USDT transfers', 'DAI transfers');
    }
    
    if (contextLower.includes('defi') || contextLower.includes('swap')) {
      suggestions.push('UNI transfers', 'LINK transfers', 'WETH transfers');
    }
    
    if (contextLower.includes('popular') || contextLower.includes('top')) {
      suggestions.push('USDC transfers', 'WETH transfers', 'MATIC transfers');
    }

    // Default suggestions if no context matches
    if (suggestions.length === 0) {
      suggestions.push(
        'USDC transfers from block 18000000',
        'WETH transfers for specific address',
        'Index popular token transfers'
      );
    }

    return suggestions.slice(0, 5);
  }
}

