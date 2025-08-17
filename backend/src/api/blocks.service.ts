import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';

export interface Block {
  id: string;
  number: number;
  hash: string;
  timestamp: Date;
  transactions: number;
  gasUsed: string;
  gasLimit: string;
  miner: string;
  difficulty: string;
  totalDifficulty: string;
  size: number;
  extraData: string;
  nonce: string;
  baseFeePerGas: string;
}

// Interface for aggregated block data from transfers
interface AggregatedBlockData {
  blockNumber: string;
  timestamp: Date;
  transactionCount: number;
  totalGasUsed: string;
  avgGasPrice: string;
  uniqueTokens: number;
  totalValue: string;
}

export interface BlocksResponse {
  blocks: Block[];
  totalBlocks: number;
  latestBlock: number;
  avgTransactions: number;
  avgBlockTime: number;
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface BlocksFilters {
  blockRange?: string;
  validator?: string;
  minTransactions?: number;
  maxTransactions?: number;
  minGasUsed?: number;
  maxGasUsed?: number;
  fromBlock?: number;
  toBlock?: number;
}

@Injectable()
export class BlocksService {
  private readonly logger = new Logger(BlocksService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Get blocks with filtering and pagination
   */
  async getBlocks(
    page: number = 1,
    limit: number = 50,
    filters: BlocksFilters = {}
  ): Promise<BlocksResponse> {
    this.logger.log(`🔍 Fetching blocks: page ${page}, limit ${limit}, filters: ${JSON.stringify(filters)}`);

    try {
      // Build where clause for filtering
      const whereClause = this.buildWhereClause(filters);
      
      // Get total count of unique blocks
      const totalBlocks = await this.getTotalBlockCount(whereClause);

      // Get latest block number
      const latestBlock = await this.getLatestBlockNumber();

      // Calculate pagination
      const offset = (page - 1) * limit;
      const totalPages = Math.ceil(totalBlocks / limit);

      // Get aggregated block data with pagination
      const aggregatedBlocks = await this.getAggregatedBlocks(whereClause, offset, limit);

      // Calculate statistics
      const avgTransactions = await this.calculateAverageTransactions(whereClause);
      const avgBlockTime = await this.calculateAverageBlockTime(whereClause);

      // Transform aggregated blocks to match interface
      const transformedBlocks: Block[] = aggregatedBlocks.map((blockData, index) => ({
        id: `block-${blockData.blockNumber}`,
        number: parseInt(blockData.blockNumber),
        hash: `0x${blockData.blockNumber.padStart(64, '0')}`, // Generate hash from block number
        timestamp: blockData.timestamp,
        transactions: blockData.transactionCount,
        gasUsed: blockData.totalGasUsed,
        gasLimit: '30000000', // Default Ethereum gas limit
        miner: '0x0000000000000000000000000000000000000000', // Default miner address
        difficulty: '0', // Default difficulty
        totalDifficulty: '0', // Default total difficulty
        size: 0, // Default size
        extraData: '0x', // Default extra data
        nonce: '0', // Default nonce
        baseFeePerGas: '0', // Default base fee
      }));

      this.logger.log(`✅ Fetched ${transformedBlocks.length} blocks out of ${totalBlocks} total`);

      return {
        blocks: transformedBlocks,
        totalBlocks,
        latestBlock,
        avgTransactions,
        avgBlockTime,
        pagination: {
          page,
          limit,
          total: totalBlocks,
          totalPages,
        },
      };
    } catch (error) {
      this.logger.error(`❌ Failed to fetch blocks:`, error);
      throw error;
    }
  }

  /**
   * Get block by number
   */
  async getBlockByNumber(blockNumber: number): Promise<Block | null> {
    this.logger.log(`🔍 Fetching block ${blockNumber}`);

    try {
      // Get transfers for the specific block
      const transfers = await this.prisma.transfer.findMany({
        where: { blockNumber: blockNumber.toString() },
        include: { token: true },
      });

      if (transfers.length === 0) {
        this.logger.log(`⚠️ Block ${blockNumber} not found`);
        return null;
      }

      // Aggregate block data from transfers
      const blockData = this.aggregateBlockData(transfers);

      return {
        id: `block-${blockNumber}`,
        number: blockNumber,
        hash: `0x${blockNumber.toString().padStart(64, '0')}`,
        timestamp: blockData.timestamp,
        transactions: blockData.transactionCount,
        gasUsed: blockData.totalGasUsed,
        gasLimit: '30000000',
        miner: '0x0000000000000000000000000000000000000000',
        difficulty: '0',
        totalDifficulty: '0',
        size: 0,
        extraData: '0x',
        nonce: '0',
        baseFeePerGas: '0',
      };
    } catch (error) {
      this.logger.error(`❌ Failed to fetch block ${blockNumber}:`, error);
      throw error;
    }
  }

  /**
   * Get block by hash
   */
  async getBlockByHash(hash: string): Promise<Block | null> {
    this.logger.log(`🔍 Fetching block with hash ${hash}`);

    try {
      // Try to extract block number from hash (since we don't have real hashes)
      // This is a simplified approach - in a real scenario you'd have a hash-to-block mapping
      if (hash.startsWith('0x') && hash.length === 66) {
        // For now, we'll search by looking for blocks with similar characteristics
        // This is a placeholder implementation
        this.logger.log(`⚠️ Hash-based block lookup not fully implemented - using placeholder`);
        return null;
      }

      this.logger.log(`⚠️ Invalid hash format: ${hash}`);
      return null;
    } catch (error) {
      this.logger.error(`❌ Failed to fetch block with hash ${hash}:`, error);
      throw error;
    }
  }

  /**
   * Search blocks by various criteria
   */
  async searchBlocks(query: string): Promise<Block[]> {
    this.logger.log(`🔍 Searching blocks with query: ${query}`);

    try {
      // Try to parse as block number
      const blockNumber = parseInt(query);
      if (!isNaN(blockNumber)) {
        const block = await this.getBlockByNumber(blockNumber);
        return block ? [block] : [];
      }

      // Try to parse as hash
      if (query.startsWith('0x') && query.length === 66) {
        const block = await this.getBlockByHash(query);
        return block ? [block] : [];
      }

      // Search by address (from/to in transfers)
      if (query.startsWith('0x') && query.length === 42) {
        // Search for blocks that contain transfers involving this address
        const transfers = await this.prisma.transfer.findMany({
          where: {
            OR: [
              { from: query },
              { to: query },
            ],
          },
          orderBy: { blockNumber: 'desc' },
          take: 10,
          include: { token: true },
        });

        // Group by block number and aggregate
        const blockMap = new Map<string, any[]>();
        transfers.forEach(transfer => {
          if (!blockMap.has(transfer.blockNumber)) {
            blockMap.set(transfer.blockNumber, []);
          }
          blockMap.get(transfer.blockNumber)!.push(transfer);
        });

        // Convert to blocks
        const blocks: Block[] = [];
        for (const [blockNumber, blockTransfers] of blockMap) {
          const blockData = this.aggregateBlockData(blockTransfers);
          blocks.push({
            id: `block-${blockNumber}`,
            number: parseInt(blockNumber),
            hash: `0x${blockNumber.padStart(64, '0')}`,
            timestamp: blockData.timestamp,
            transactions: blockData.transactionCount,
            gasUsed: blockData.totalGasUsed,
            gasLimit: '30000000',
            miner: '0x0000000000000000000000000000000000000000',
            difficulty: '0',
            totalDifficulty: '0',
            size: 0,
            extraData: '0x',
            nonce: '0',
            baseFeePerGas: '0',
          });
        }

        return blocks;
      }

      this.logger.log(`⚠️ No valid search criteria found for query: ${query}`);
      return [];
    } catch (error) {
      this.logger.error(`❌ Failed to search blocks:`, error);
      throw error;
    }
  }

  /**
   * Build where clause for filtering
   */
  private buildWhereClause(filters: BlocksFilters): any {
    const whereClause: any = {};

    // Block range filtering
    if (filters.fromBlock !== undefined) {
      whereClause.blockNumber = { ...whereClause.blockNumber, gte: filters.fromBlock.toString() };
    }
    if (filters.toBlock !== undefined) {
      whereClause.blockNumber = { ...whereClause.blockNumber, lte: filters.toBlock.toString() };
    }

    // Time-based filtering
    if (filters.blockRange) {
      const now = new Date();
      let fromDate: Date;

      switch (filters.blockRange) {
        case 'last-24h':
          fromDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
          break;
        case 'last-7d':
          fromDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          break;
        case 'last-30d':
          fromDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
          break;
        case 'last-90d':
          fromDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
          break;
        default:
          // 'all-time' - no date filter
          break;
      }

      if (fromDate) {
        whereClause.timestamp = { gte: fromDate };
      }
    }

    // Gas usage filtering
    if (filters.minGasUsed !== undefined) {
      whereClause.gasUsed = { ...whereClause.gasUsed, gte: filters.minGasUsed.toString() };
    }
    if (filters.maxGasUsed !== undefined) {
      whereClause.gasUsed = { ...whereClause.gasUsed, lte: filters.maxGasUsed.toString() };
    }

    return whereClause;
  }

  /**
   * Get total count of unique blocks
   */
  private async getTotalBlockCount(whereClause: any): Promise<number> {
    try {
      const result = await this.prisma.transfer.groupBy({
        by: ['blockNumber'],
        where: whereClause,
        _count: { blockNumber: true },
      });
      return result.length;
    } catch (error) {
      this.logger.error(`❌ Failed to get total block count:`, error);
      return 0;
    }
  }

  /**
   * Get aggregated block data with pagination
   */
  private async getAggregatedBlocks(whereClause: any, offset: number, limit: number): Promise<AggregatedBlockData[]> {
    try {
      // Get unique block numbers with pagination
      const blockNumbers = await this.prisma.transfer.groupBy({
        by: ['blockNumber'],
        where: whereClause,
        orderBy: { blockNumber: 'desc' },
        skip: offset,
        take: limit,
      });

      // Get detailed data for each block
      const aggregatedBlocks: AggregatedBlockData[] = [];
      
      for (const block of blockNumbers) {
        const transfers = await this.prisma.transfer.findMany({
          where: { 
            blockNumber: block.blockNumber,
            ...whereClause 
          },
          include: { token: true },
        });

        if (transfers.length > 0) {
          const blockData = this.aggregateBlockData(transfers);
          aggregatedBlocks.push(blockData);
        }
      }

      return aggregatedBlocks;
    } catch (error) {
      this.logger.error(`❌ Failed to get aggregated blocks:`, error);
      return [];
    }
  }

  /**
   * Aggregate block data from transfers
   */
  private aggregateBlockData(transfers: any[]): AggregatedBlockData {
    if (transfers.length === 0) {
      return {
        blockNumber: '0',
        timestamp: new Date(),
        transactionCount: 0,
        totalGasUsed: '0',
        avgGasPrice: '0',
        uniqueTokens: 0,
        totalValue: '0',
      };
    }

    const totalGasUsed = transfers.reduce((sum, t) => {
      const gasUsed = t.gasUsed ? parseInt(t.gasUsed) : 0;
      return sum + gasUsed;
    }, 0);

    const totalGasPrice = transfers.reduce((sum, t) => {
      const gasPrice = t.gasPrice ? parseInt(t.gasPrice) : 0;
      return sum + gasPrice;
    }, 0);

    const uniqueTokens = new Set(transfers.map(t => t.tokenId)).size;
    const totalValue = transfers.reduce((sum, t) => {
      const value = t.value ? parseFloat(t.value) : 0;
      return sum + value;
    }, 0);

    return {
      blockNumber: transfers[0].blockNumber,
      timestamp: transfers[0].timestamp,
      transactionCount: transfers.length,
      totalGasUsed: totalGasUsed.toString(),
      avgGasPrice: transfers.length > 0 ? (totalGasPrice / transfers.length).toString() : '0',
      uniqueTokens,
      totalValue: totalValue.toString(),
    };
  }

  /**
   * Get latest block number
   */
  private async getLatestBlockNumber(): Promise<number> {
    try {
      const latestTransfer = await this.prisma.transfer.findFirst({
        orderBy: { blockNumber: 'desc' },
        select: { blockNumber: true },
      });
      return latestTransfer ? parseInt(latestTransfer.blockNumber) : 0;
    } catch (error) {
      this.logger.error(`❌ Failed to get latest block number:`, error);
      return 0;
    }
  }

  /**
   * Calculate average transactions per block
   */
  private async calculateAverageTransactions(whereClause: any): Promise<number> {
    try {
      const result = await this.prisma.transfer.aggregate({
        where: whereClause,
        _count: { id: true },
      });

      const totalTransfers = result._count.id;
      const totalBlocks = await this.getTotalBlockCount(whereClause);
      
      return totalBlocks > 0 ? totalTransfers / totalBlocks : 0;
    } catch (error) {
      this.logger.error(`❌ Failed to calculate average transactions:`, error);
      return 0;
    }
  }

  /**
   * Calculate average block time
   */
  private async calculateAverageBlockTime(whereClause: any): Promise<number> {
    try {
      // Get two most recent blocks
      const recentBlocks = await this.prisma.transfer.groupBy({
        by: ['blockNumber'],
        where: whereClause,
        orderBy: { blockNumber: 'desc' },
        take: 2,
      });

      if (recentBlocks.length < 2) {
        return 12; // Default Ethereum block time
      }

      // Get timestamps for the two blocks
      const [block1, block2] = await Promise.all([
        this.prisma.transfer.findFirst({
          where: { blockNumber: recentBlocks[0].blockNumber },
          select: { timestamp: true },
        }),
        this.prisma.transfer.findFirst({
          where: { blockNumber: recentBlocks[1].blockNumber },
          select: { timestamp: true },
        }),
      ]);

      if (!block1 || !block2) {
        return 12;
      }

      const timeDiff = block1.timestamp.getTime() - block2.timestamp.getTime();
      return Math.round(timeDiff / 1000); // Convert to seconds
    } catch (error) {
      this.logger.error(`❌ Failed to calculate average block time:`, error);
      return 12; // Default Ethereum block time
    }
  }
}
