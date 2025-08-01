import { Module } from '@nestjs/common';
import { OrchestratorService } from './orchestrator.service';
import { OrchestratorController } from './orchestrator.controller';
import { AiModule } from '../ai/ai.module';
import { IndexerModule } from '../indexer/indexer.module';
import { WebsocketModule } from '../websocket/websocket.module';

@Module({
  imports: [AiModule, IndexerModule, WebsocketModule],
  providers: [OrchestratorService],
  controllers: [OrchestratorController],
  exports: [OrchestratorService],
})
export class OrchestratorModule {}