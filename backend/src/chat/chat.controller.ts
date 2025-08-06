import { Controller, Post, Get, Body, Logger } from '@nestjs/common';
import { ChatService } from './chat.service';
import { ChatRequestDto, ChatApiResponseDto } from './dto/chat.dto';

@Controller('chat')
export class ChatController {
  private readonly logger = new Logger(ChatController.name);

  constructor(private readonly chatService: ChatService) {}

  /**
   * Process a conversational message
   * POST /chat/message
   */
  @Post('message')
  async processMessage(@Body() body: ChatRequestDto): Promise<ChatApiResponseDto> {
    const { message, conversationHistory = [] } = body;

    if (!message?.trim()) {
      this.logger.warn('Empty message received');
      return {
        success: false,
        error: 'Message is required and cannot be empty',
        timestamp: new Date()
      };
    }

    this.logger.log(`📨 Processing chat message: "${message.substring(0, 50)}..."`);

    try {
      const response = await this.chatService.processConversation(
        message,
        conversationHistory
      );

      this.logger.log(`🤖 Chat response: ${response.isQueryReady ? 'READY' : 'NEEDS_MORE_INFO'} (confidence: ${response.confidence})`);

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
   * GET /chat/suggestions
   */
  @Get('suggestions')
  async getSuggestions() {
    try {
      const suggestions = await this.chatService.getChatSuggestions();
      
      return {
        success: true,
        suggestions,
        timestamp: new Date()
      };
    } catch (error) {
      this.logger.error('Failed to get suggestions:', error);
      
      return {
        success: false,
        error: 'Failed to get suggestions',
        suggestions: [],
        timestamp: new Date()
      };
    }
  }

  /**
   * Health check for chat service
   * GET /chat/health
   */
  @Get('health')
  async healthCheck() {
    try {
      // Test with a simple message
      const testResponse = await this.chatService.processConversation(
        "test message",
        []
      );

      return {
        success: true,
        status: 'healthy',
        service: 'chat',
        test: {
          input: 'test message',
          isQueryReady: testResponse.isQueryReady,
          confidence: testResponse.confidence
        },
        timestamp: new Date()
      };
    } catch (error) {
      this.logger.error('Chat health check failed:', error);
      
      return {
        success: false,
        status: 'unhealthy',
        service: 'chat',
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date()
      };
    }
  }
}