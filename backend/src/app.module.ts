import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { IndexerModule } from './indexer/indexer.module';
import { AiModule } from './ai/ai.module';
import { ApiModule } from './api/api.module';
import { WebsocketModule } from './websocket/websocket.module';
import { DatabaseModule } from './database/database.module';
import { AppController } from './app.controller';
import { IndexingOrchestratorModule } from './indexing-orchestrator/indexing-orchestrator.module';
import { OrchestratorModule } from './orchestrator/orchestrator.module'; // Add this


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
  ],
  controllers: [AppController],
})
export class AppModule {}