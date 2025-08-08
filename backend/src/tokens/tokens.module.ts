// backend/src/tokens/tokens.module.ts
import { Module } from '@nestjs/common';
import { TokensService } from './tokens.service';
import { TokensController } from './tokens.controller';

@Module({
  providers: [TokensService],
  controllers: [TokensController],
  exports: [TokensService], // Export for use in other modules
})
export class TokensModule {}
