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
      throw error;
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

  // Helper method to seed database with sample data
  async seedSampleData() {
    try {
      console.log('🌱 Seeding database with sample data...');

      // Create sample tokens
      const usdcToken = await this.token.upsert({
        where: { address: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48' },
        update: {},
        create: {
          address: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
          name: 'USD Coin',
          symbol: 'USDC',
          decimals: 6,
          isPopular: true,
        },
      });

      const wethToken = await this.token.upsert({
        where: { address: '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2' },
        update: {},
        create: {
          address: '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2',
          name: 'Wrapped Ether',
          symbol: 'WETH',
          decimals: 18,
          isPopular: true,
        },
      });

      console.log('✅ Sample tokens created');

      // Create sample transfers
      const sampleTransfers = [
        {
          blockNumber: '18000000',
          txHash: '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef',
          from: '0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b6',
          to: '0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b7',
          value: '1000000', // 1 USDC
          tokenId: usdcToken.id,
          timestamp: new Date('2024-01-01T12:00:00Z'),
          gasUsed: '21000',
          gasPrice: '20000000000',
        },
        {
          blockNumber: '18000001',
          txHash: '0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890',
          from: '0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b7',
          to: '0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b8',
          value: '1000000000000000000', // 1 WETH
          tokenId: wethToken.id,
          timestamp: new Date('2024-01-01T13:00:00Z'),
          gasUsed: '65000',
          gasPrice: '25000000000',
        },
      ];

      for (const transfer of sampleTransfers) {
        await this.transfer.upsert({
          where: { txHash: transfer.txHash },
          update: {},
          create: transfer,
        });
      }

      console.log('✅ Sample transfers created');

      // Create a completed indexing job
      const completedJob = await this.indexingJob.upsert({
        where: { id: 'sample-completed-job' },
        update: {},
        create: {
          id: 'sample-completed-job',
          query: 'Show me all token transfers',
          config: {
            originalQuery: 'Show me all token transfers',
            apiEndpoint: 'transfers',
            addresses: [usdcToken.address, wethToken.address],
            fromBlock: '18000000',
            toBlock: '18001000',
            events: ['Transfer'],
            filters: {},
          },
          status: 'completed',
          priority: 'normal',
          tier: 'warm',
          fromBlock: '18000000',
          toBlock: '18001000',
          addresses: [usdcToken.address, wethToken.address],
          events: ['Transfer'],
          progress: 100,
          blocksProcessed: '1000',
          estimatedBlocks: '1000',
          completedAt: new Date(),
        },
      });

      console.log('✅ Sample completed indexing job created');

      return {
        success: true,
        message: 'Sample data seeded successfully',
        tokens: [usdcToken, wethToken],
        transfers: sampleTransfers.length,
        job: completedJob.id,
      };

    } catch (error) {
      console.error('❌ Error seeding sample data:', error);
      return {
        success: false,
        error: error.message,
      };
    }
  }
}