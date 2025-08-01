// src/orchestrator/indexing-orchestrator.module.ts
import { Module } from '@nestjs/common';
import { IndexingOrchestratorService } from './indexing-orchestrator.service';
import { IndexingOrchestratorController } from './indexing-orchestrator.controller';
import { IndexerModule } from '../indexer/indexer.module';
import { AiModule } from '../ai/ai.module';
import { DynamicApiService } from 'src/api/dynamic-api.service';

@Module({
  imports: [IndexerModule, AiModule],
  providers: [IndexingOrchestratorService, DynamicApiService],
  controllers: [IndexingOrchestratorController],
  exports: [IndexingOrchestratorService],
})
export class IndexingOrchestratorModule {}