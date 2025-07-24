import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { IndexerModule } from './indexer/indexer.module';
import { AiModule } from './ai/ai.module';
import { ApiModule } from './api/api.module';
import { WebsocketModule } from './websocket/websocket.module';
import { DatabaseModule } from './database/database.module';

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
  ],
})
export class AppModule {}
