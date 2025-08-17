import { Module } from '@nestjs/common';
import { DynamicApiService } from './dynamic-api.service';
import { DynamicApiController } from './dynamic-api.controller';
import { BlocksService } from './blocks.service';
import { BlocksController } from './blocks.controller';
import { IndexerGateway } from 'src/websocket/indexer.gateway';

@Module({
  providers: [DynamicApiService, BlocksService, IndexerGateway],
  controllers: [DynamicApiController, BlocksController], // Back to original order
  exports: [DynamicApiService, BlocksService],
})
export class ApiModule {}