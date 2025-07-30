import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { IndexerModule } from './indexer/indexer.module';
import { AiModule } from './ai/ai.module';
import { ApiModule } from './api/api.module';
import { WebsocketModule } from './websocket/websocket.module';
import { DatabaseModule } from './database/database.module';
import { AppController } from './app.controller';
import { IndexingOrchestratorModule } from './orchestrator/indexing-orchestrator.module';

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
  ],
  controllers: [AppController],
})
export class AppModule {}