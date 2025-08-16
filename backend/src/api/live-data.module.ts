import { Module } from '@nestjs/common';
import { LiveDataController } from './live-data.controller';
import { DatabaseModule } from '../database/database.module';

@Module({
  imports: [DatabaseModule],
  controllers: [LiveDataController],
  exports: [],
})
export class LiveDataModule {}
