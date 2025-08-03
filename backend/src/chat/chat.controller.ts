import { Controller, Post, Body, Logger } from '@nestjs/common';
import { ChatService } from './chat.service';

interface ChatRequest {
  message: string;
  conversationHistory?: Array<{
    role: 'user' | 'assistant';
    content: string;
  }>;
}

@Controller('chat')
export class ChatController {
  private readonly logger = new Logger(ChatController.name);

  constructor(private readonly chatService: ChatService) {}

  /**
   * Process a conversational message
   * POST /chat/message
   */
  @Post('message')
  async processMessage(@Body() body: ChatRequest) {
    const { message, conversationHistory = [] } = body;

    if (!message?.trim()) {
      return {
        success: false,
        error: 'Message is required',
        timestamp: new Date()
      };
    }

    this.logger.log(`📨 Processing chat message: "${message}"`);

    try {
      const response = await this.chatService.processConversation(
        message,
        conversationHistory
      );

      this.logger.log(`🤖 Chat response ready: ${response.isQueryReady ? 'READY' : 'NEEDS_MORE_INFO'}`);

      return {
        success: true,
        response,
        timestamp: new Date()
      };

    } catch (error) {
      this.logger.error(`❌ Chat processing failed:`, error);
      
      return {
        success: false,
        error: 'Failed to process message',
        response: {
          message: "I'm sorry, I'm having trouble understanding right now. Could you try rephrasing your request?",
          isQueryReady: false,
          confidence: 0,
          needsMoreInfo: ['clarification']
        },
        timestamp: new Date()
      };
    }
  }

  /**
   * Get conversation suggestions
   * POST /chat/suggestions
   */
  @Post('suggestions')
  async getSuggestions(@Body() body: { context?: string }) {
    const suggestions = [
      "Index USDC transfers from the latest 1000 blocks",
      "Track WETH transfers for a specific address",
      "Monitor USDT transfers above $10,000",
      "Index all transfers from block 18000000 to 18001000",
      "Track transfers for address 0x742d35cc44b75c42b4b6c5a8b964b08d2a6f6c42"
    ];

    return {
      success: true,
      suggestions,
      timestamp: new Date()
    };
  }

  /**
   * Health check for chat service
   * GET /chat/health
   */
  @Post('health')
  async healthCheck() {
    try {
      // Simple test to verify OpenAI connectivity
      const testResponse = await this.chatService.processConversation(
        "test message",
        []
      );

      return {
        success: true,
        status: 'healthy',
        aiService: 'connected',
        timestamp: new Date()
      };
    } catch (error) {
      this.logger.error('Chat health check failed:', error);
      
      return {
        success: false,
        status: 'unhealthy',
        aiService: 'disconnected',
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date()
      };
    }
  }
}