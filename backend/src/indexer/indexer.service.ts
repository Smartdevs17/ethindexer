import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ethers } from 'ethers';
import { PrismaService } from '../database/prisma.service';

@Injectable()
export class IndexerService {
  private readonly logger = new Logger(IndexerService.name);
  private provider: ethers.Provider;
  
  // Popular tokens to pre-index
  private readonly POPULAR_TOKENS = [
    {
      address: '0xA0b86a33E6842176cCAb7687C5ECaE3a969b6c5',
      name: 'USD Coin',
      symbol: 'USDC',
      decimals: 6
    },
    {
      address: '0xdac17f958d2ee523a2206206994597c13d831ec7',
      name: 'Tether USD',
      symbol: 'USDT',
      decimals: 6
    },
    {
      address: '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2',
      name: 'Wrapped Ether',
      symbol: 'WETH',
      decimals: 18
    }
  ];

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {
    this.initializeProvider();
  }

  private initializeProvider() {
    const infuraUrl = this.config.get<string>('INFURA_URL');
    const alchemyUrl = this.config.get<string>('ALCHEMY_URL');
    
    if (infuraUrl) {
      this.provider = new ethers.JsonRpcProvider(infuraUrl);
      this.logger.log('✅ Connected to Infura');
    } else if (alchemyUrl) {
      this.provider = new ethers.JsonRpcProvider(alchemyUrl);
      this.logger.log('✅ Connected to Alchemy');
    } else {
      this.logger.warn('⚠️ No RPC URL provided, using default provider');
      this.provider = ethers.getDefaultProvider('mainnet');
    }
  }

  // Initialize popular tokens in database
  async initializePopularTokens() {
    this.logger.log('🚀 Initializing popular tokens...');
    
    for (const token of this.POPULAR_TOKENS) {
      try {
        await this.prisma.token.upsert({
          where: { address: token.address },
          create: {
            address: token.address,
            name: token.name,
            symbol: token.symbol,
            decimals: token.decimals,
            isPopular: true,
            indexingTier: 'popular'
          },
          update: {
            isPopular: true,
            indexingTier: 'popular'
          }
        });
        
        this.logger.log(`✅ Token ${token.symbol} initialized`);
      } catch (error) {
        this.logger.error(`❌ Failed to initialize token ${token.symbol}:`, error);
      }
    }
  }

  // Get latest block number
  async getLatestBlock(): Promise<number> {
    try {
      const blockNumber = await this.provider.getBlockNumber();
      this.logger.log(`📦 Latest block: ${blockNumber}`);
      return blockNumber;
    } catch (error) {
      this.logger.error('❌ Failed to get latest block:', error);
      throw error;
    }
  }

  // Updated indexTransfers method with 100-record limit
async indexTransfers(tokenAddress: string, fromBlock?: number, toBlock?: number, maxRecords: number = 100): Promise<number> {
  this.logger.log(`🔍 Indexing transfers for ${tokenAddress} (max ${maxRecords} records)`);
  
  try {
    await this.ensureTokenExists(tokenAddress);
    
    const actualToBlock = toBlock || await this.getLatestBlock();
    const actualFromBlock = fromBlock || (actualToBlock - 50); // Default: last 50 blocks
    
    const token = await this.prisma.token.findUnique({
      where: { address: tokenAddress.toLowerCase() }
    });
    
    // Use very small chunks to avoid hitting limits
    const chunkSize = 10;
    let totalProcessed = 0;
    
    this.logger.log(`📦 Processing blocks ${actualFromBlock} to ${actualToBlock} (limit: ${maxRecords} records)`);
    
    // Process in small chunks and stop at maxRecords
    for (let currentFrom = actualFromBlock; currentFrom <= actualToBlock && totalProcessed < maxRecords; currentFrom += chunkSize) {
      const currentTo = Math.min(currentFrom + chunkSize - 1, actualToBlock);
      
      try {
        const remainingRecords = maxRecords - totalProcessed;
        const chunkProcessed = await this.indexTransfersChunk(tokenAddress, currentFrom, currentTo, remainingRecords);
        totalProcessed += chunkProcessed;
        
        this.logger.log(`📊 Processed: ${totalProcessed}/${maxRecords} records`);
        
        if (totalProcessed >= maxRecords) {
          this.logger.log(`✅ Reached limit of ${maxRecords} records`);
          break;
        }
        
        await new Promise(resolve => setTimeout(resolve, 100));
        
      } catch (error) {
        this.logger.error(`❌ Failed to process chunk ${currentFrom}-${currentTo}:`, error);
      }
    }

    this.logger.log(`✅ Total processed: ${totalProcessed} transfers`);
    return totalProcessed;
    
  } catch (error) {
    this.logger.error(`❌ Failed to index transfers for ${tokenAddress}:`, error);
    throw error;
  }
}

// Updated chunk processing with record limit
private async indexTransfersChunk(tokenAddress: string, fromBlock: number, toBlock: number, maxRecords: number = 100): Promise<number> {
  try {
    const transferTopic = ethers.id("Transfer(address,address,uint256)");
    
    const logs = await this.provider.getLogs({
      address: tokenAddress,
      topics: [transferTopic],
      fromBlock,
      toBlock
    });

    // Limit logs to maxRecords (take most recent)
    const limitedLogs = logs.slice(-maxRecords);
    
    this.logger.log(`📊 Found ${logs.length} logs, processing ${limitedLogs.length} (limited to ${maxRecords})`);

    let processedCount = 0;
    for (const log of limitedLogs) {
      if (processedCount >= maxRecords) break;
      
      try {
        await this.processTransferLog(log, tokenAddress);
        processedCount++;
      } catch (error) {
        this.logger.error(`❌ Failed to process log ${log.transactionHash}:`, error);
      }
    }

    return processedCount;
    
  } catch (error) {
    this.logger.error(`❌ Failed to process chunk ${fromBlock}-${toBlock}:`, error);
    throw error;
  }
}

// Updated hot data indexing with limit
async indexHotData(): Promise<void> {
  this.logger.log('🔥 Starting hot data indexing (100 records max per token)...');
  
  try {
    const latestBlock = await this.getLatestBlock();
    const hotDataBlocks = 50; // Reduced to 50 blocks for efficiency
    const fromBlock = latestBlock - hotDataBlocks;

    this.logger.log(`🔥 Indexing last ${hotDataBlocks} blocks (${fromBlock} to ${latestBlock})`);

    const popularTokens = await this.prisma.token.findMany({
      where: { isPopular: true }
    });

    for (const token of popularTokens) {
      this.logger.log(`🔥 Indexing hot data for ${token.symbol || token.address} (max 100 records)`);
      
      try {
        await this.indexTransfers(token.address, fromBlock, latestBlock, 100); // Limit to 100 records
        
        await this.prisma.token.update({
          where: { id: token.id },
          data: { lastIndexed: new Date() }
        });
        
        this.logger.log(`✅ Completed indexing for ${token.symbol}`);
        
      } catch (error) {
        this.logger.error(`❌ Failed to index ${token.symbol}:`, error);
      }
    }

    this.logger.log('✅ Hot data indexing completed');
    
  } catch (error) {
    this.logger.error('❌ Hot data indexing failed:', error);
    throw error;
  }
}
private async processTransferLog(log: ethers.Log, tokenAddress: string) {
  try {
    // Decode transfer event
    const iface = new ethers.Interface([
      "event Transfer(address indexed from, address indexed to, uint256 value)"
    ]);
    
    const parsed = iface.parseLog(log);
    if (!parsed) {
      this.logger.warn(`⚠️ Failed to parse log ${log.transactionHash}`);
      return;
    }

    const { from, to, value } = parsed.args;
    
    // Debug: Log safely
    this.logger.debug(`Raw parsed value: ${value.toString()}`);
    
    // Get block details for timestamp
    const block = await this.provider.getBlock(log.blockNumber);
    if (!block) {
      this.logger.warn(`⚠️ Block ${log.blockNumber} not found`);
      return;
    }

    // Find token in database
    const token = await this.prisma.token.findUnique({
      where: { address: tokenAddress.toLowerCase() }
    });
    
    if (!token) {
      this.logger.error(`❌ Token ${tokenAddress} not found in database`);
      return;
    }

    // Simple string conversion - works universally!
    const transferValue = value.toString();
    const blockNumber = log.blockNumber.toString();

    // Check if transfer already exists
    const existingTransfer = await this.prisma.transfer.findFirst({
      where: {
        txHash: log.transactionHash,
        blockNumber: blockNumber,
        from: from.toLowerCase(),
        to: to.toLowerCase()
      }
    });

    if (existingTransfer) {
      this.logger.debug(`⚠️ Transfer already exists: ${log.transactionHash}`);
      return;
    }

    // Get transaction details for gas info
    let gasUsed: string | null = null;
    let gasPrice: string | null = null;
    
    try {
      const tx = await this.provider.getTransaction(log.transactionHash);
      gasUsed = tx?.gasLimit ? tx.gasLimit.toString() : null;
      gasPrice = tx?.gasPrice ? tx.gasPrice.toString() : null;
    } catch (gasError) {
      this.logger.debug(`⚠️ Could not get gas info for ${log.transactionHash}`);
    }

    // Create transfer record - clean and simple!
    await this.prisma.transfer.create({
      data: {
        blockNumber: blockNumber,
        txHash: log.transactionHash,
        from: from.toLowerCase(),
        to: to.toLowerCase(),
        value: transferValue,
        tokenId: token.id,
        timestamp: new Date(Number(block.timestamp) * 1000),
        gasUsed: gasUsed,
        gasPrice: gasPrice,
        tier: token.isPopular ? 'hot' : 'warm',
        indexed: true
      }
    });

    this.logger.debug(`✅ Saved transfer: ${from.slice(0,6)}...${from.slice(-4)} -> ${to.slice(0,6)}...${to.slice(-4)} (${transferValue})`);

  } catch (error) {
    this.logger.error(`❌ Failed to process transfer log: ${error.message}`);
    this.logger.error(`Transaction: ${log.transactionHash}, Block: ${log.blockNumber}`);
    throw error;
  }
}

// Updated ensureTokenExists method
private async ensureTokenExists(tokenAddress: string) {
  const normalizedAddress = tokenAddress.toLowerCase();
  
  const existingToken = await this.prisma.token.findUnique({
    where: { address: normalizedAddress }
  });

  if (!existingToken) {
    this.logger.log(`🆕 Creating new token record for ${tokenAddress}`);
    
    try {
      const contract = new ethers.Contract(
        tokenAddress,
        [
          "function name() view returns (string)",
          "function symbol() view returns (string)",
          "function decimals() view returns (uint8)",
          "function totalSupply() view returns (uint256)"
        ],
        this.provider
      );

      const [name, symbol, decimals, totalSupply] = await Promise.allSettled([
        contract.name(),
        contract.symbol(),
        contract.decimals(),
        contract.totalSupply()
      ]);

      await this.prisma.token.create({
        data: {
          address: normalizedAddress,
          name: name.status === 'fulfilled' ? name.value : null,
          symbol: symbol.status === 'fulfilled' ? symbol.value : null,
          decimals: decimals.status === 'fulfilled' ? Number(decimals.value) : null,
          totalSupply: totalSupply.status === 'fulfilled' ? totalSupply.value.toString() : null,
          isPopular: false,
          indexingTier: 'on-demand'
        }
      });

      this.logger.log(`✅ Token ${tokenAddress} added to database`);
      
    } catch (error) {
      this.logger.error(`❌ Failed to get token details for ${tokenAddress}, creating basic record`);
      
      await this.prisma.token.create({
        data: {
          address: normalizedAddress,
          isPopular: false,
          indexingTier: 'on-demand'
        }
      });
    }
  }
}


  // Get indexing statistics
  async getIndexingStats() {
    return {
      blockchain: {
        latestBlock: await this.getLatestBlock(),
        provider: this.provider ? 'connected' : 'disconnected'
      },
      database: await this.prisma.getStats(),
      popularTokens: await this.prisma.token.count({ where: { isPopular: true } }),
      activeJobs: await this.prisma.indexingJob.count({ where: { status: 'active' } })
    };
  }
}