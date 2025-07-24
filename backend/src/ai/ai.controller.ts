import { Controller, Post, Body } from '@nestjs/common';
import { AiService } from './ai.service';

@Controller('ai')
export class AiController {
  constructor(private readonly aiService: AiService) {}

  @Post('parse-query')
  async parseQuery(@Body() { query }: { query: string }) {
    return this.aiService.parseNaturalLanguageQuery(query);
  }
}
