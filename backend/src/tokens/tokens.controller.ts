

import { Controller, Get, Query, Logger } from '@nestjs/common';
import { TokensService } from './tokens.service';

@Controller('tokens')
export class TokensController {
  private readonly logger = new Logger(TokensController.name);

  constructor(private readonly tokensService: TokensService) {}

  /**
   * Search tokens for auto-complete
   * GET /tokens/search?q=usdc&limit=10
   */
  @Get('search')
  async searchTokens(
    @Query('q') query: string = '',
    @Query('limit') limit: string = '10'
  ) {
    try {
      const limitNum = parseInt(limit) || 10;
      const tokens = await this.tokensService.searchTokens(query, limitNum);
      
      return {
        success: true,
        query,
        tokens,
        count: tokens.length,
        timestamp: new Date()
      };
    } catch (error) {
      this.logger.error('Token search failed:', error);
      return {
        success: false,
        error: error.message,
        timestamp: new Date()
      };
    }
  }

  /**
   * Get popular tokens
   * GET /tokens/popular
   */
  @Get('popular')
  async getPopularTokens(@Query('limit') limit: string = '8') {
    try {
      const limitNum = parseInt(limit) || 8;
      const tokens = await this.tokensService.getPopularTokens(limitNum);
      
      return {
        success: true,
        tokens,
        count: tokens.length,
        timestamp: new Date()
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        timestamp: new Date()
      };
    }
  }

  /**
   * Get contextual suggestions
   * GET /tokens/suggestions?context=defi
   */
  @Get('suggestions')
  async getContextualSuggestions(@Query('context') context: string = '') {
    try {
      const suggestions = await this.tokensService.getContextualSuggestions(context);
      
      return {
        success: true,
        suggestions,
        context,
        timestamp: new Date()
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        timestamp: new Date()
      };
    }
  }
}

