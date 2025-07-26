import { Controller, Get, Post, Body, Param, Query, Logger } from '@nestjs/common';
import { IndexerService } from './indexer.service';

@Controller('indexer')
export class IndexerController {
  private readonly logger = new Logger(IndexerController.name);

  constructor(private readonly indexerService: IndexerService) {}

  @Get('stats')
  async getStats() {
    return this.indexerService.getIndexingStats();
  }

  @Get('latest-block')
  async getLatestBlock() {
    const blockNumber = await this.indexerService.getLatestBlock();
    return { blockNumber, timestamp: new Date() };
  }

  @Post('initialize-popular-tokens')
  async initializePopularTokens() {
    this.logger.log('🚀 Initializing popular tokens...');
    await this.indexerService.initializePopularTokens();
    return { 
      message: 'Popular tokens initialized successfully',
      timestamp: new Date()
    };
  }

  @Post('index-hot-data')
  async indexHotData() {
    this.logger.log('🔥 Starting hot data indexing...');
    await this.indexerService.indexHotData();
    return { 
      message: 'Hot data indexing completed',
      timestamp: new Date()
    };
  }

  @Post('index-token')
  async indexToken(@Body() body: {
    tokenAddress: string;
    fromBlock?: number;
    toBlock?: number;
  }) {
    const { tokenAddress, fromBlock, toBlock } = body;
    
    this.logger.log(`🔍 Indexing token: ${tokenAddress}`);
    
    if (!tokenAddress) {
      throw new Error('Token address is required');
    }

    // If no fromBlock specified, use recent blocks
    let actualFromBlock = fromBlock;
    if (!actualFromBlock) {
      const latestBlock = await this.indexerService.getLatestBlock();
      actualFromBlock = latestBlock - 1000; // Last 1000 blocks
    }

    const processedCount = await this.indexerService.indexTransfers(
      tokenAddress,
      actualFromBlock,
      toBlock
    );

    return {
      message: `Indexed ${processedCount} transfers for token ${tokenAddress}`,
      tokenAddress,
      fromBlock: actualFromBlock,
      toBlock: toBlock || 'latest',
      processedTransfers: processedCount,
      timestamp: new Date()
    };
  }

  @Get('token/:address')
  async getTokenInfo(@Param('address') address: string) {
    // This will be implemented when we add the database queries
    return {
      message: `Token info for ${address}`,
      address,
      note: 'Full token info endpoint coming soon'
    };
  }

  @Get('transfers')
  async getTransfers(
    @Query('token') token?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string
  ) {
    // This will be implemented when we add the database queries
    return {
      message: 'Transfers endpoint',
      filters: { token, from, to },
      pagination: { limit: limit || '100', offset: offset || '0' },
      note: 'Full transfers endpoint coming soon'
    };
  }
}