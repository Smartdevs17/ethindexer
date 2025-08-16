import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { IndexerModule } from './indexer/indexer.module';
import { AiModule } from './ai/ai.module';
import { ApiModule } from './api/api.module';
import { WebsocketModule } from './websocket/websocket.module';
import { DatabaseModule } from './database/database.module';
import { AppController } from './app.controller';
import { IndexingOrchestratorModule } from './indexing-orchestrator/indexing-orchestrator.module';
import { OrchestratorModule } from './orchestrator/orchestrator.module';
import { ChatModule } from './chat/chat.module';
import { TokensModule } from './tokens/tokens.module';
import { LiveDataModule } from './api/live-data.module';
import { UsersModule } from './users/users.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    DatabaseModule,
    IndexerModule,
    AiModule,
    ApiModule,
    WebsocketModule,
    IndexingOrchestratorModule,
    OrchestratorModule,
    ChatModule,
    TokensModule,
    LiveDataModule,
    UsersModule,
  ],
  controllers: [AppController],
})
export class AppModule {}