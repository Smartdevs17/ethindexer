import { Module } from '@nestjs/common';
import { DynamicApiService } from './dynamic-api.service';
import { DynamicApiController } from './dynamic-api.controller';
import { IndexerGateway } from 'src/websocket/indexer.gateway';

@Module({
  providers: [DynamicApiService, IndexerGateway],
  controllers: [DynamicApiController],
  exports: [DynamicApiService],
})
export class ApiModule {}