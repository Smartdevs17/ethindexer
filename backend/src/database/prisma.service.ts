import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  constructor() {
    super({
      log: ['query', 'info', 'warn', 'error'], // Enable logging for development
    });
  }

  async onModuleInit() {
    try {
      await this.$connect();
      console.log('✅ Database connected successfully');
    } catch (error) {
      console.error('❌ Database connection failed:', error);
      // Don't throw error - allow app to start even if DB is unavailable
      // This is important for Vercel deployments where DB might not be configured
      console.warn('⚠️  Continuing without database connection. Some features may be unavailable.');
    }
  }

  async onModuleDestroy() {
    await this.$disconnect();
    console.log('🔌 Database disconnected');
  }

  // Helper method to check database health
  async healthCheck() {
    try {
      await this.$queryRaw`SELECT 1`;
      return { status: 'healthy', timestamp: new Date() };
    } catch (error) {
      return { status: 'unhealthy', error: error.message, timestamp: new Date() };
    }
  }

  // Helper method to get database stats
  async getStats() {
    try {
      const [transferCount, tokenCount, jobCount, endpointCount] = await Promise.all([
        this.transfer.count(),
        this.token.count(),
        this.indexingJob.count(),
        this.apiEndpoint.count(),
      ]);

      return {
        transfers: transferCount,
        tokens: tokenCount,
        indexingJobs: jobCount,
        apiEndpoints: endpointCount,
        timestamp: new Date(),
      };
    } catch (error) {
      console.error('Error getting database stats:', error);
      return null;
    }
  }
}