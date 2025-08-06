import { Injectable, Logger } from '@nestjs/common';
import { AiService } from '../ai/ai.service';
import { ChatMessageDto, ChatResponseDto } from './dto/chat.dto';

@Injectable()
export class ChatService {
  private readonly logger = new Logger(ChatService.name);

  constructor(private readonly aiService: AiService) {}

  /**
   * Process a conversational message and determine next action
   */
  async processConversation(
    userMessage: string,
    conversationHistory: ChatMessageDto[] = []
  ): Promise<ChatResponseDto> {
    this.logger.log(`💬 Processing chat: "${userMessage}"`);

    try {
      // Analyze the user's message using simple heuristics
      const analysis = this.analyzeUserMessage(userMessage, conversationHistory);
      
      if (analysis.isQueryReady) {
        // Message is ready to be executed - prepare it for the orchestrator
        this.logger.log(`✅ Query ready for execution: "${userMessage}"`);
        
        return {
          message: analysis.response,
          isQueryReady: true,
          suggestedQuery: userMessage,
          confidence: analysis.confidence,
          conversationContext: {
            totalMessages: conversationHistory.length + 1,
            lastUserMessage: userMessage
          }
        };
      } else {
        // Message needs more information - guide the user
        this.logger.log(`🤔 Query needs more info: ${analysis.needsMoreInfo?.join(', ')}`);
        
        return {
          message: analysis.response,
          isQueryReady: false,
          needsMoreInfo: analysis.needsMoreInfo,
          confidence: analysis.confidence,
          conversationContext: {
            totalMessages: conversationHistory.length + 1,
            lastUserMessage: userMessage
          }
        };
      }
    } catch (error) {
      this.logger.error('❌ Chat processing failed:', error);
      
      // Fallback response
      return {
        message: "I'm having trouble processing your request. Could you try rephrasing what you'd like to index?",
        isQueryReady: false,
        needsMoreInfo: ['clarification'],
        confidence: 0.1,
        conversationContext: {
          totalMessages: conversationHistory.length + 1,
          lastUserMessage: userMessage
        }
      };
    }
  }

  /**
   * Analyze user message to determine if it's ready to execute
   */
  private analyzeUserMessage(
    message: string, 
    history: ChatMessageDto[]
  ): {
    isQueryReady: boolean;
    response: string;
    confidence: number;
    needsMoreInfo?: string[];
  } {
    const lowerMessage = message.toLowerCase();
    
    // Check for essential components
    const hasToken = this.hasTokenReference(lowerMessage);
    const hasAction = this.hasActionWord(lowerMessage);
    const hasBlockInfo = this.hasBlockReference(lowerMessage);
    
    // Calculate confidence based on components present
    let confidence = 0;
    const components = [];
    
    if (hasToken) {
      confidence += 0.4;
      components.push('token');
    }
    if (hasAction) {
      confidence += 0.3;
      components.push('action');
    }
    if (hasBlockInfo) {
      confidence += 0.3;
      components.push('block_info');
    }
    
    // Consider conversation context
    if (history.length > 0) {
      confidence += 0.1; // Slight boost for ongoing conversation
    }
    
    const isReady = confidence >= 0.7;
    const missing = this.identifyMissingComponents(hasToken, hasAction, hasBlockInfo);
    
    if (isReady) {
      return {
        isQueryReady: true,
        response: `Perfect! I'll index ${this.describeQuery(message)} for you. Creating the indexing job now...`,
        confidence
      };
    } else {
      return {
        isQueryReady: false,
        response: this.generateGuidanceMessage(missing, history),
        confidence,
        needsMoreInfo: missing
      };
    }
  }

  /**
   * Check if message contains token/contract references
   */
  private hasTokenReference(message: string): boolean {
    const tokenPatterns = [
      /\busdc\b/i,
      /\busdt\b/i, 
      /\bweth\b/i,
      /\bethereum\b/i,
      /\btoken\b/i,
      /0x[a-f0-9]{40}/i // Contract address pattern
    ];
    
    return tokenPatterns.some(pattern => pattern.test(message));
  }

  /**
   * Check if message contains action words
   */
  private hasActionWord(message: string): boolean {
    const actionPatterns = [
      /\bindex\b/i,
      /\btrack\b/i,
      /\bmonitor\b/i,
      /\bget\b/i,
      /\bfind\b/i,
      /\bcollect\b/i,
      /\bgather\b/i
    ];
    
    return actionPatterns.some(pattern => pattern.test(message));
  }

  /**
   * Check if message contains block/range information
   */
  private hasBlockReference(message: string): boolean {
    const blockPatterns = [
      /\bblock\b/i,
      /\bfrom\b.*\bto\b/i,
      /\blatest\b/i,
      /\brecent\b/i,
      /\d{7,}/i // Large numbers (likely block numbers)
    ];
    
    return blockPatterns.some(pattern => pattern.test(message));
  }

  /**
   * Identify what components are missing
   */
  private identifyMissingComponents(
    hasToken: boolean,
    hasAction: boolean, 
    hasBlock: boolean
  ): string[] {
    const missing = [];
    
    if (!hasToken) missing.push('token_or_address');
    if (!hasAction) missing.push('action');
    if (!hasBlock) missing.push('block_range');
    
    return missing;
  }

  /**
   * Generate helpful guidance message based on what's missing
   */
  private generateGuidanceMessage(
    missing: string[],
    history: ChatMessageDto[]
  ): string {
    if (missing.includes('token_or_address')) {
      return "Which token would you like to track? For example:\n\n• USDC transfers\n• USDT transfers  \n• WETH transfers\n• Or provide a contract address (0x...)";
    }
    
    if (missing.includes('action')) {
      return "What would you like me to do? For example:\n\n• Index all transfers\n• Track transfers for a specific address\n• Monitor transfers above a certain value";
    }
    
    if (missing.includes('block_range')) {
      return "What block range should I index? For example:\n\n• From the latest 1000 blocks\n• From block 18000000 to latest\n• Just say 'latest' for ongoing monitoring";
    }
    
    // Generic fallback
    return "I'd be happy to help you index blockchain data! Could you tell me more about what you'd like to track?";
  }

  /**
   * Describe the query in friendly terms
   */
  private describeQuery(message: string): string {
    const lower = message.toLowerCase();
    
    if (lower.includes('usdc')) return 'USDC transfers';
    if (lower.includes('usdt')) return 'USDT transfers';
    if (lower.includes('weth')) return 'WETH transfers';
    if (lower.includes('0x')) return 'transfers for that contract';
    
    return 'the blockchain data you specified';
  }

  /**
   * Get chat suggestions for the user
   */
  async getChatSuggestions(context?: string): Promise<string[]> {
    const suggestions = [
      "Index USDC transfers from the latest 1000 blocks",
      "Track WETH transfers for a specific address", 
      "Monitor USDT transfers above $10,000",
      "Index all transfers from block 18000000 to 18001000"
    ];

    return suggestions;
  }
}