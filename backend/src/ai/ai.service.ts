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

  async parseNaturalLanguageQuery(query: string): Promise<IndexingConfig> 
{
    const prompt = `
    Parse this blockchain indexing request into a structured 
configuration:
    Query: "${query}"
    
    Extract:
    - addresses: array of Ethereum addresses (empty array if none 
specified)
    - events: types of events to index (default: ["Transfer"])
    - fromBlock: starting block number (null if not specified)
    - toBlock: ending block number (null for ongoing)
    - filters: additional filtering criteria
    - apiEndpoint: suggested REST endpoint path (kebab-case)
    
    Return JSON only with these exact keys.
    `;

    try {
      const response = await this.openai.chat.completions.create({
        model: 'gpt-4',
        messages: [{ role: 'user', content: prompt }],
        response_format: { type: 'json_object' },
      });

      const config = JSON.parse(response.choices[0].message.content);
      return {
        ...config,
        originalQuery: query,
      };
    } catch (error) {
      console.error('AI parsing error:', error);
      // Fallback to basic parsing
      return {
        addresses: [],
        events: ['Transfer'],
        apiEndpoint: 'generic-data',
        originalQuery: query,
      };
    }
  }
}
