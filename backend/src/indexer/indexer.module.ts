import { Module } from '@nestjs/common';
import { IndexerService } from './indexer.service';
import { IndexerController } from './indexer.controller';
import { AiModule } from '../ai/ai.module';
import { IndexerGateway } from 'src/websocket/indexer.gateway';

@Module({
  imports: [AiModule],
  providers: [IndexerService, IndexerGateway],
  controllers: [IndexerController],
  exports: [IndexerService],
})
export class IndexerModule {}
