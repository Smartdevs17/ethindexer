import { Controller, Get, Post } from '@nestjs/common';
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

  @Post('seed')
  async seedDatabase() {
    try {
      const result = await this.prisma.seedSampleData();
      return {
        success: true,
        message: 'Database seeded successfully',
        data: result,
        timestamp: new Date(),
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        timestamp: new Date(),
      };
    }
  }

  @Get()
  getRoot() {
    return {
      message: '🚀 EthIndexer API is running!',
      version: '1.0.0',
      endpoints: {
        health: '/health',
        seed: 'POST /seed',
        api: '/api',
        indexer: '/indexer',
        ai: '/ai',
      }
    };
  }
}