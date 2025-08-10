import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ChatService } from './chat.service';
import { ChatController } from './chat.controller';
import { AiModule } from '../ai/ai.module';

@Module({
  imports: [AiModule, ConfigModule], 
  providers: [ChatService],
  controllers: [ChatController],
  exports: [ChatService], 
})
export class ChatModule {}