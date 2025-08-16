import { Controller, Get, Query } from '@nestjs/common';
import { Logger } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';

@Controller('live-data')
export class LiveDataController {
  private readonly logger = new Logger(LiveDataController.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Get live data statistics for the dashboard
   * GET /live-data/stats
   */
  @Get('stats')
  async getLiveDataStats() {
    try {
      this.logger.log('📊 Fetching live data statistics...');

      // Get counts from database
      const [transferCount, tokenCount, jobCount, endpointCount] = await Promise.all([
        this.prisma.transfer.count(),
        this.prisma.token.count(),
        this.prisma.indexingJob.count(),
        this.prisma.apiEndpoint.count(),
      ]);

      // Get recent transfers for activity feed
      const recentTransfers = await this.prisma.transfer.findMany({
        take: 10,
        orderBy: { timestamp: 'desc' },
        include: {
          token: {
            select: {
              symbol: true,
              name: true,
              address: true,
            },
          },
        },
      });

      // Calculate data volume (estimated)
      const dataVolume = transferCount * 0.5; // Rough estimate: 0.5KB per transfer

      // Get active jobs count
      const activeJobsCount = await this.prisma.indexingJob.count({
        where: {
          status: {
            in: ['pending', 'processing', 'indexing'],
          },
        },
      });

      // Get completed jobs count
      const completedJobsCount = await this.prisma.indexingJob.count({
        where: {
          status: 'completed',
        },
      });

      return {
        success: true,
        stats: {
          totalTransfers: transferCount,
          activeAPIs: endpointCount,
          dataVolume: `${(dataVolume / 1024 / 1024 / 1024).toFixed(2)}GB`, // Convert to GB
          uptime: '99.9%', // Placeholder
          activeJobs: activeJobsCount,
          completedJobs: completedJobsCount,
          totalTokens: tokenCount,
        },
        recentActivity: recentTransfers.map(transfer => ({
          id: transfer.id,
          value: transfer.value,
          token: {
            address: transfer.token.address,
            symbol: transfer.token.symbol,
            name: transfer.token.name,
          },
          from: transfer.from,
          to: transfer.to,
          blockNumber: transfer.blockNumber,
          timestamp: transfer.timestamp,
          txHash: transfer.txHash,
        })),
        timestamp: new Date(),
      };
    } catch (error) {
      this.logger.error('❌ Failed to fetch live data stats:', error);
      return {
        success: false,
        error: error.message,
        timestamp: new Date(),
      };
    }
  }

  /**
   * Get recent transfers for the activity feed
   * GET /live-data/recent-transfers?limit=20
   */
  @Get('recent-transfers')
  async getRecentTransfers(@Query('limit') limit?: string) {
    try {
      const limitNum = parseInt(limit) || 20;
      this.logger.log(`📡 Fetching ${limitNum} recent transfers...`);

      const transfers = await this.prisma.transfer.findMany({
        take: limitNum,
        orderBy: { timestamp: 'desc' },
        include: {
          token: {
            select: {
              symbol: true,
              name: true,
              address: true,
            },
          },
        },
      });

      return {
        success: true,
        transfers: transfers.map(transfer => ({
          id: transfer.id,
          value: transfer.value,
          token: {
            address: transfer.token.address,
            symbol: transfer.token.symbol,
            name: transfer.token.name,
          },
          from: transfer.from,
          to: transfer.to,
          blockNumber: transfer.blockNumber,
          timestamp: transfer.timestamp,
          txHash: transfer.txHash,
        })),
        count: transfers.length,
        timestamp: new Date(),
      };
    } catch (error) {
      this.logger.error('❌ Failed to fetch recent transfers:', error);
      return {
        success: false,
        error: error.message,
        timestamp: new Date(),
      };
    }
  }

  /**
   * Get transfer statistics by token
   * GET /live-data/token-stats
   */
  @Get('token-stats')
  async getTokenStats() {
    try {
      this.logger.log('📊 Fetching token statistics...');

      // Get all tokens with their transfer counts
      const tokens = await this.prisma.token.findMany({
        include: {
          _count: {
            select: {
              transfers: true,
            },
          },
        },
        orderBy: {
          transfers: {
            _count: 'desc',
          },
        },
        take: 10,
      });

      const tokenStats = tokens.map(token => ({
        symbol: token.symbol,
        name: token.name,
        address: token.address,
        transfer_count: token._count.transfers,
        total_volume: '0', // Placeholder for now
        last_transfer: null, // Placeholder for now
      }));

      return {
        success: true,
        tokenStats,
        timestamp: new Date(),
      };
    } catch (error) {
      this.logger.error('❌ Failed to fetch token stats:', error);
      return {
        success: false,
        error: error.message,
        timestamp: new Date(),
      };
    }
  }
}
