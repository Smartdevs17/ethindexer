import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import OpenAI from 'openai';

export interface IndexingConfig {
  addresses: string[];
  events: string[];
  fromBlock?: number;
  toBlock?: number;
  filters?: Record<string, any>;
  apiEndpoint: string;
  originalQuery: string;
}

@Injectable()
export class AiService {
  private openai: OpenAI;

  constructor(private configService: ConfigService) {
    this.openai = new OpenAI({
      apiKey: this.configService.get<string>('OPENAI_API_KEY'),
    });
  }

  async parseNaturalLanguageQuery(query: string): Promise<IndexingConfig> {
    const prompt = `
Parse this blockchain indexing request into a structured JSON configuration.

Query: "${query}"

Extract and return ONLY a valid JSON object with these exact keys:
- addresses: array of Ethereum addresses (empty array if none specified)
- events: types of events to index (default: ["Transfer"])
- fromBlock: starting block number (number or null if not specified)
- toBlock: ending block number (number or null for ongoing)
- filters: additional filtering criteria (object)
- apiEndpoint: suggested REST endpoint path in kebab-case

Example response:
{
  "addresses": ["0x123..."],
  "events": ["Transfer"],
  "fromBlock": 18000000,
  "toBlock": null,
  "filters": {},
  "apiEndpoint": "usdc-transfers"
}

IMPORTANT: Return ONLY the JSON object, no other text.
    `;

    try {
      const response = await this.openai.chat.completions.create({
        model: 'gpt-4o', // Updated to model that supports json_object
        messages: [
          { 
            role: 'system', 
            content: 'You are a blockchain data parsing assistant. Always respond with valid JSON only.' 
          },
          { 
            role: 'user', 
            content: prompt 
          }
        ],
        response_format: { type: 'json_object' },
        temperature: 0.1, // Low temperature for consistent parsing
        max_tokens: 500,
      });

      const content = response.choices[0].message.content;
      console.log('AI Response:', content); // Debug log
      
      const config = JSON.parse(content);
      
      // 🔧 FIX: If AI doesn't provide addresses, include popular tokens by default
      let addresses = Array.isArray(config.addresses) ? config.addresses : [];
      if (addresses.length === 0) {
        // Include popular tokens for generic queries
        addresses = [
          '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48', // USDC
          '0xdac17f958d2ee523a2206206994597c13d831ec7', // USDT
          '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2', // WETH
          '0x6b175474e89094c44da98b954eedeac495271d0f', // DAI
        ];
      }
      
      // Validate and clean the response
      const cleanConfig: IndexingConfig = {
        addresses,
        events: Array.isArray(config.events) ? config.events : ['Transfer'],
        fromBlock: typeof config.fromBlock === 'number' ? config.fromBlock : null,
        toBlock: typeof config.toBlock === 'number' ? config.toBlock : null,
        filters: typeof config.filters === 'object' ? config.filters : {},
        apiEndpoint: typeof config.apiEndpoint === 'string' ? config.apiEndpoint : 'generic-data',
        originalQuery: query,
      };

      console.log('Parsed config:', cleanConfig); // Debug log
      return cleanConfig;

    } catch (error) {
      console.error('AI parsing error:', error);
      
      // Enhanced fallback parsing with basic regex
      const fallbackConfig = this.basicFallbackParsing(query);
      return {
        ...fallbackConfig,
        originalQuery: query,
      };
    }
  }

  // Enhanced fallback parsing for when AI fails
  private basicFallbackParsing(query: string): Omit<IndexingConfig, 'originalQuery'> {
    const lowerQuery = query.toLowerCase();
    
    // Extract addresses (0x followed by 40 hex chars)
    const addressMatches = query.match(/0x[a-fA-F0-9]{40}/g) || [];
    
    // Extract block numbers
    const blockMatches = query.match(/block\s+(\d+)/gi);
    let fromBlock = null;
    let toBlock = null;
    
    if (blockMatches) {
      const blocks = blockMatches.map(match => {
        const num = match.match(/\d+/);
        return num ? parseInt(num[0]) : null;
      }).filter(Boolean);
      
      if (blocks.length >= 1) fromBlock = blocks[0];
      if (blocks.length >= 2) toBlock = blocks[1];
    }
    
    // 🔧 FIX: If no specific addresses provided, include popular tokens by default
    let addresses = addressMatches;
    if (addresses.length === 0) {
      // Include popular tokens for generic queries
      addresses = [
        '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48', // USDC
        '0xdac17f958d2ee523a2206206994597c13d831ec7', // USDT
        '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2', // WETH
        '0x6b175474e89094c44da98b954eedeac495271d0f', // DAI
      ];
    }
    
    // Determine API endpoint base based on content
    let apiEndpointBase = 'generic-data';
    if (lowerQuery.includes('usdc')) apiEndpointBase = 'usdc-transfers';
    else if (lowerQuery.includes('usdt')) apiEndpointBase = 'usdt-transfers';
    else if (lowerQuery.includes('weth')) apiEndpointBase = 'weth-transfers';
    else if (lowerQuery.includes('dai')) apiEndpointBase = 'dai-transfers';
    else if (addresses.length > 0) apiEndpointBase = 'address-transfers';
    
    // Note: The actual unique endpoint will be generated when the job is created
    // This is just the base pattern
    const apiEndpoint = apiEndpointBase;
    
    // Basic filters
    const filters: Record<string, any> = {};
    if (lowerQuery.includes('above') || lowerQuery.includes('greater')) {
      filters.minValue = 'detected';
    }
    
    return {
      addresses,
      events: ['Transfer'],
      fromBlock,
      toBlock,
      filters,
      apiEndpoint,
    };
  }
}