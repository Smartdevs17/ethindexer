import { Controller, Get } from '@nestjs/common';
import { PrismaService } from './database/prisma.service';

@Controller()
export class AppController {
  constructor(private readonly prisma: PrismaService) {}

  @Get('health')
  async getHealth() {
    const dbHealth = await this.prisma.healthCheck();
    const dbStats = await this.prisma.getStats();
    
    return {
      status: 'ok',
      timestamp: new Date(),
      database: dbHealth,
      stats: dbStats,
    };
  }

  @Get()
  getRoot() {
    return {
      message: '🚀 EthIndexer API is running!',
      version: '1.0.0',
      endpoints: {
        health: '/health',
        api: '/api',
        indexer: '/indexer',
        ai: '/ai',
      }
    };
  }
}