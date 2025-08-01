import { Module } from '@nestjs/common';
import { IndexerGateway } from './indexer.gateway';

@Module({
  providers: [IndexerGateway],
  exports: [IndexerGateway],
})
export class WebsocketModule {}