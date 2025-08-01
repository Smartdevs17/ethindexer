import { Module } from '@nestjs/common';
import { DynamicApiService } from './dynamic-api.service';
import { DynamicApiController } from './dynamic-api.controller';

@Module({
  providers: [DynamicApiService],
  controllers: [DynamicApiController],
  exports: [DynamicApiService],
})
export class ApiModule {}