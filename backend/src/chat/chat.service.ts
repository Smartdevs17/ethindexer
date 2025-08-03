import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import OpenAI from 'openai';

export interface ChatResponse {
  message: string;
  isQueryReady: boolean;
  suggestedQuery?: string;
  needsMoreInfo?: string[];
  confidence: number;
}

@Injectable()
export class ChatService {
  private openai: OpenAI;

  constructor(private configService: ConfigService) {
    this.openai = new OpenAI({
      apiKey: this.configService.get<string>('OPENAI_API_KEY'),
    });
  }

  async processConversation(
    userMessage: string, 
    conversationHistory: Array<{role: 'user' | 'assistant', content: string}> = []
  ): Promise<ChatResponse> {
    
    const systemPrompt = `You are EthIndexer AI, a friendly assistant that helps users index blockchain data using natural language.

Your role is to:
1. Guide users to create clear, actionable indexing queries
2. Ask clarifying questions when needed
3. Confirm when a query is ready to execute
4. Be conversational and helpful

Guidelines:
- Keep responses concise and friendly
- Ask ONE clarifying question at a time
- Focus on: token/address, block range, specific conditions
- Common tokens: USDC, USDT, WETH, or specific contract addresses
- Block ranges: "latest 1000 blocks", "from block X to Y", "ongoing monitoring"

Response format:
- If query is ready to execute: Confirm and set isQueryReady=true
- If needs clarification: Ask one specific question and set isQueryReady=false
- Always be helpful and encouraging

Examples of ready queries:
- "Index USDC transfers from the latest 1000 blocks"
- "Track WETH transfers for address 0x123..."
- "Monitor USDT transfers from block 18000000"

Current conversation context: The user wants to index blockchain data.`;

    try {
      const messages = [
        { role: 'system' as const, content: systemPrompt },
        ...conversationHistory,
        { role: 'user' as const, content: userMessage }
      ];

      const response = await this.openai.chat.completions.create({
        model: 'gpt-4o',
        messages,
        temperature: 0.7,
        max_tokens: 300,
        functions: [
          {
            name: 'analyze_query_readiness',
            description: 'Analyze if the user query is ready to execute as an indexing job',
            parameters: {
              type: 'object',
              properties: {
                isQueryReady: {
                  type: 'boolean',
                  description: 'True if the query contains enough information to create an indexing job'
                },
                confidence: {
                  type: 'number',
                  description: 'Confidence level 0-1 that this assessment is correct'
                },
                suggestedQuery: {
                  type: 'string',
                  description: 'If ready, the exact query string to execute'
                },
                needsMoreInfo: {
                  type: 'array',
                  items: { type: 'string' },
                  description: 'List of missing information needed if not ready'
                }
              },
              required: ['isQueryReady', 'confidence']
            }
          }
        ],
        function_call: { name: 'analyze_query_readiness' }
      });

      const assistantMessage = response.choices[0].message.content || 
        "I'd be happy to help you index blockchain data! What would you like to track?";

      let analysis = {
        isQueryReady: false,
        confidence: 0.5,
        suggestedQuery: undefined,
        needsMoreInfo: []
      };

      // Parse function call if present
      if (response.choices[0].message.function_call) {
        try {
          analysis = JSON.parse(response.choices[0].message.function_call.arguments);
        } catch (e) {
          console.warn('Failed to parse function call arguments:', e);
        }
      }

      // Fallback analysis using simple heuristics
      if (!response.choices[0].message.function_call) {
        analysis = this.analyzeQueryHeuristics(userMessage);
      }

      return {
        message: assistantMessage,
        isQueryReady: analysis.isQueryReady,
        suggestedQuery: analysis.suggestedQuery,
        needsMoreInfo: analysis.needsMoreInfo,
        confidence: analysis.confidence
      };

    } catch (error) {
      console.error('Chat service error:', error);
      
      // Fallback to heuristic analysis
      const fallbackAnalysis = this.analyzeQueryHeuristics(userMessage);
      
      return {
        message: "I'm here to help you index blockchain data! What would you like to track?",
        isQueryReady: fallbackAnalysis.isQueryReady,
        suggestedQuery: fallbackAnalysis.suggestedQuery,
        needsMoreInfo: fallbackAnalysis.needsMoreInfo || ['token or address', 'block range'],
        confidence: 0.3
      };
    }
  }

  private analyzeQueryHeuristics(input: string): {
    isQueryReady: boolean;
    confidence: number;
    suggestedQuery: string;
    needsMoreInfo: string[];
  } {
    const lowerInput = input.toLowerCase();
    
    // Check for essential components
    const hasToken = /usdc|usdt|weth|ethereum|0x[a-f0-9]{40}/i.test(input);
    const hasAction = /index|track|monitor|get|find/i.test(input);
    const hasBlockInfo = /block|from|to|latest|\d+/i.test(input);
    
    // Calculate readiness score
    const readinessScore = (hasToken ? 0.4 : 0) + (hasAction ? 0.3 : 0) + (hasBlockInfo ? 0.3 : 0);
    const isReady = readinessScore >= 0.7;
    
    const missing = [];
    if (!hasToken) missing.push('token or contract address');
    if (!hasAction) missing.push('action to perform');
    if (!hasBlockInfo) missing.push('block range');
    
    return {
      isQueryReady: isReady,
      confidence: readinessScore,
      suggestedQuery: isReady ? input : '',
      needsMoreInfo: missing
    };
  }

  /**
   * Generate contextual follow-up questions
   */
  generateFollowUpQuestion(needsMoreInfo: string[]): string {
    if (needsMoreInfo.includes('token or contract address')) {
      return "Which token would you like to track? For example: USDC, USDT, WETH, or a specific contract address (0x...).";
    }
    
    if (needsMoreInfo.includes('block range')) {
      return "What block range should I index? For example: 'latest 1000 blocks', 'from block 18000000', or 'ongoing monitoring'.";
    }
    
    if (needsMoreInfo.includes('action to perform')) {
      return "What would you like me to do? For example: 'index transfers', 'track all activity', or 'monitor for specific conditions'.";
    }
    
    return "Could you provide more details about what you'd like to index?";
  }
}