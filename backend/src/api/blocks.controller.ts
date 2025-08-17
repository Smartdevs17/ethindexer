import { Controller, Get, Query, Param, ParseIntPipe, ParseBoolPipe } from '@nestjs/common';
import { BlocksService, BlocksFilters } from './blocks.service';

@Controller('api/blocks')
export class BlocksController {
  constructor(private readonly blocksService: BlocksService) {}

  /**
   * Get blocks with filtering and pagination
   */
  @Get()
  async getBlocks(
    @Query('page') page: string = '1',
    @Query('limit') limit: string = '50',
    @Query('blockRange') blockRange?: string,
    @Query('validator') validator?: string,
    @Query('minTransactions') minTransactions?: string,
    @Query('maxTransactions') maxTransactions?: string,
    @Query('minGasUsed') minGasUsed?: string,
    @Query('maxGasUsed') maxGasUsed?: string,
    @Query('fromBlock') fromBlock?: string,
    @Query('toBlock') toBlock?: string,
  ) {
    const pageNum = parseInt(page) || 1;
    const limitNum = parseInt(limit) || 50;
    
    const filters: BlocksFilters = {
      blockRange,
      validator,
      minTransactions: minTransactions ? parseInt(minTransactions) : undefined,
      maxTransactions: maxTransactions ? parseInt(maxTransactions) : undefined,
      minGasUsed: minGasUsed ? parseInt(minGasUsed) : undefined,
      maxGasUsed: maxGasUsed ? parseInt(maxGasUsed) : undefined,
      fromBlock: fromBlock ? parseInt(fromBlock) : undefined,
      toBlock: toBlock ? parseInt(toBlock) : undefined,
    };

    return this.blocksService.getBlocks(pageNum, limitNum, filters);
  }

  /**
   * Get block by number
   */
  @Get('number/:blockNumber')
  async getBlockByNumber(@Param('blockNumber', ParseIntPipe) blockNumber: number) {
    return this.blocksService.getBlockByNumber(blockNumber);
  }

  /**
   * Get block by hash
   */
  @Get('hash/:hash')
  async getBlockByHash(@Param('hash') hash: string) {
    return this.blocksService.getBlockByHash(hash);
  }

  /**
   * Search blocks by various criteria
   */
  @Get('search')
  async searchBlocks(@Query('q') query: string) {
    if (!query) {
      return { blocks: [], message: 'Search query is required' };
    }
    
    const blocks = await this.blocksService.searchBlocks(query);
    return { blocks, total: blocks.length };
  }

  /**
   * Get blocks statistics
   */
  @Get('stats')
  async getBlocksStats() {
    const blocks = await this.blocksService.getBlocks(1, 1);
    
    return {
      totalBlocks: blocks.totalBlocks,
      latestBlock: blocks.latestBlock,
      avgTransactions: blocks.avgTransactions,
      avgBlockTime: blocks.avgBlockTime,
    };
  }
}
