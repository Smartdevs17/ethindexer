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
      // Analyze the user's message WITH conversation context
      const analysis = this.analyzeWithConversationContext(userMessage, conversationHistory);
      
      if (analysis.isQueryReady) {
        // Message is ready to be executed - prepare it for the orchestrator
        this.logger.log(`✅ Query ready for execution: "${analysis.combinedQuery}"`);
        
        return {
          message: analysis.response,
          isQueryReady: true,
          suggestedQuery: analysis.combinedQuery,
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
   * Analyze user message WITH conversation context
   */
  private analyzeWithConversationContext(
    message: string, 
    history: ChatMessageDto[]
  ): {
    isQueryReady: boolean;
    response: string;
    confidence: number;
    needsMoreInfo?: string[];
    combinedQuery?: string;
  } {
    // Combine current message with recent conversation context
    const contextualInfo = this.extractConversationContext(message, history);
    const combinedQuery = this.buildCombinedQuery(contextualInfo);
    
    this.logger.log(`🧠 Contextual analysis: ${JSON.stringify(contextualInfo)}`);
    this.logger.log(`🔗 Combined query: "${combinedQuery}"`);
    
    // Analyze the combined query
    const hasToken = this.hasTokenReference(combinedQuery) || contextualInfo.hasToken;
    const hasAction = this.hasActionWord(combinedQuery) || contextualInfo.hasAction;
    const hasBlockInfo = this.hasBlockReference(combinedQuery) || contextualInfo.hasBlock;
    
    // Calculate confidence based on components present
    let confidence = 0;
    
    if (hasToken) confidence += 0.4;
    if (hasAction) confidence += 0.4; // Increased weight for actions
    if (hasBlockInfo) confidence += 0.2;
    
    // Bonus for conversation flow
    if (history.length > 0) confidence += 0.1;
    
    const isReady = confidence >= 0.7;
    const missing = this.identifyMissingComponents(hasToken, hasAction, hasBlockInfo);
    
    if (isReady) {
      return {
        isQueryReady: true,
        response: `Perfect! I'll ${this.describeAction(combinedQuery, contextualInfo)}. Creating the indexing job now...`,
        confidence,
        combinedQuery
      };
    } else {
      return {
        isQueryReady: false,
        response: this.generateContextualGuidanceMessage(missing, contextualInfo, history),
        confidence,
        needsMoreInfo: missing
      };
    }
  }

  /**
   * Extract meaningful information from conversation context
   */
  private extractConversationContext(currentMessage: string, history: ChatMessageDto[]) {
    const allMessages = [...history.map(h => h.content), currentMessage];
    const combinedText = allMessages.join(' ').toLowerCase();
    
    // Extract tokens mentioned in conversation
    const tokens = [];
    if (/\busdc\b/i.test(combinedText)) tokens.push('USDC');
    if (/\busdt\b/i.test(combinedText)) tokens.push('USDT');
    if (/\bweth\b/i.test(combinedText)) tokens.push('WETH');
    
    // Extract contract addresses
    const contractMatch = combinedText.match(/0x[a-f0-9]{40}/i);
    if (contractMatch) tokens.push(contractMatch[0]);
    
    // Extract actions
    const actions = [];
    if (/\bindex\b/i.test(combinedText)) actions.push('index');
    if (/\btrack\b/i.test(combinedText)) actions.push('track');
    if (/\bmonitor\b/i.test(combinedText)) actions.push('monitor');
    if (/\ball transfers\b/i.test(combinedText)) actions.push('index all transfers'); // FIX: Recognize "all transfers"
    
    // Extract block information
    const blockInfo = [];
    const blockMatch = combinedText.match(/\d{7,}/);
    if (blockMatch) blockInfo.push(`block ${blockMatch[0]}`);
    if (/\blatest\b/i.test(combinedText)) blockInfo.push('latest blocks');
    if (/\brecent\b/i.test(combinedText)) blockInfo.push('recent blocks');
    
    return {
      tokens,
      actions,
      blockInfo,
      hasToken: tokens.length > 0,
      hasAction: actions.length > 0,
      hasBlock: blockInfo.length > 0,
      allText: combinedText
    };
  }

  /**
   * Build a combined query from conversation context
   */
  private buildCombinedQuery(contextInfo: any): string {
    const parts = [];
    
    // Add action
    if (contextInfo.actions.length > 0) {
      parts.push(contextInfo.actions[0]);
    }
    
    // Add token
    if (contextInfo.tokens.length > 0) {
      parts.push(`${contextInfo.tokens[0]} transfers`);
    }
    
    // Add block info
    if (contextInfo.blockInfo.length > 0) {
      parts.push(`from ${contextInfo.blockInfo[0]}`);
    }
    
    return parts.join(' ');
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
      /\bgather\b/i,
      /\ball transfers\b/i // FIX: Add "all transfers" as valid action
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
   * Generate contextual guidance message based on what's missing and conversation state
   */
  private generateContextualGuidanceMessage(
    missing: string[],
    contextInfo: any,
    history: ChatMessageDto[]
  ): string {
    // If we're missing multiple things but this is the first message, ask for the most important
    if (missing.includes('token_or_address') && missing.includes('action')) {
      return "I'd be happy to help you index blockchain data! What would you like to do? For example:\n\n• Index USDC transfers\n• Track WETH transfers\n• Monitor USDT transfers";
    }
    
    if (missing.includes('token_or_address')) {
      return "Which token would you like to track? For example:\n\n• USDC transfers\n• USDT transfers  \n• WETH transfers\n• Or provide a contract address (0x...)";
    }
    
    if (missing.includes('action')) {
      const tokenText = contextInfo.tokens.length > 0 ? ` ${contextInfo.tokens[0]}` : '';
      return `What would you like me to do with${tokenText} transfers? For example:\n\n• Index all transfers\n• Track transfers for a specific address\n• Monitor transfers above a certain value`;
    }
    
    if (missing.includes('block_range')) {
      const actionText = contextInfo.actions.length > 0 ? contextInfo.actions[0] : 'index';
      const tokenText = contextInfo.tokens.length > 0 ? ` ${contextInfo.tokens[0]}` : '';
      return `What block range should I ${actionText}${tokenText} transfers from? For example:\n\n• From the latest 1000 blocks\n• From block 18000000 to latest\n• Just say 'latest' for ongoing monitoring`;
    }
    
    // Generic fallback
    return "I'd be happy to help you index blockchain data! Could you tell me more about what you'd like to track?";
  }

  /**
   * Describe the action in friendly terms
   */
  private describeAction(combinedQuery: string, contextInfo: any): string {
    const action = contextInfo.actions[0] || 'index';
    const token = contextInfo.tokens[0] || 'token';
    const block = contextInfo.blockInfo[0] || 'specified blocks';
    
    return `${action} ${token} transfers from ${block}`;
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