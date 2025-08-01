import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ethers } from 'ethers';
import { PrismaService } from '../database/prisma.service';
import { IndexerGateway } from '../websocket/indexer.gateway';


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
    private readonly indexerGateway: IndexerGateway,
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

// Enhanced indexTransfers method with progress tracking:
async indexTransfers(tokenAddress: string, fromBlock?: number, toBlock?: number, maxRecords: number = 100): Promise<number> {
  this.logger.log(`🔍 Indexing transfers for ${tokenAddress} (max ${maxRecords} records)`);
  
  try {
    await this.ensureTokenExists(tokenAddress);
    
    const actualToBlock = toBlock || await this.getLatestBlock();
    const actualFromBlock = fromBlock || (actualToBlock - 50);
    
    const token = await this.prisma.token.findUnique({
      where: { address: tokenAddress.toLowerCase() }
    });
    
    // Emit indexing start status
    this.indexerGateway.emitSystemStatus({
      message: `Starting to index ${token?.symbol || tokenAddress.slice(0, 8)}... transfers`,
      stage: 'indexing-start',
      timestamp: new Date(),
    });

    const chunkSize = 10;
    let totalProcessed = 0;
    const totalBlocks = actualToBlock - actualFromBlock + 1;
    
    this.logger.log(`📦 Processing blocks ${actualFromBlock} to ${actualToBlock} (limit: ${maxRecords} records)`);
    
    for (let currentFrom = actualFromBlock; currentFrom <= actualToBlock && totalProcessed < maxRecords; currentFrom += chunkSize) {
      const currentTo = Math.min(currentFrom + chunkSize - 1, actualToBlock);
      
      try {
        const remainingRecords = maxRecords - totalProcessed;
        const chunkProcessed = await this.indexTransfersChunk(tokenAddress, currentFrom, currentTo, remainingRecords);
        totalProcessed += chunkProcessed;
        
        // Calculate progress percentage
        const blocksProcessed = currentTo - actualFromBlock + 1;
        const progressPercent = Math.min((blocksProcessed / totalBlocks) * 100, 100);
        
        // Emit progress update
        this.indexerGateway.emitSystemStatus({
          message: `Processed: ${totalProcessed}/${maxRecords} transfers (${progressPercent.toFixed(1)}%)`,
          stage: 'indexing-progress',
          timestamp: new Date(),
        });
        
        this.logger.log(`📊 Processed: ${totalProcessed}/${maxRecords} records (${progressPercent.toFixed(1)}%)`);
        
        if (totalProcessed >= maxRecords) {
          this.logger.log(`✅ Reached limit of ${maxRecords} records`);
          break;
        }
        
        await new Promise(resolve => setTimeout(resolve, 100));
        
      } catch (error) {
        this.logger.error(`❌ Failed to process chunk ${currentFrom}-${currentTo}:`, error);
      }
    }

    // Emit completion status
    this.indexerGateway.emitSystemStatus({
      message: `Completed indexing ${totalProcessed} transfers for ${token?.symbol || tokenAddress.slice(0, 8)}...`,
      stage: 'indexing-complete',
      timestamp: new Date(),
    });

    // Update token last indexed time
    await this.prisma.token.update({
      where: { id: token.id },
      data: { lastIndexed: new Date() }
    });

    this.logger.log(`✅ Total processed: ${totalProcessed} transfers`);
    return totalProcessed;
    
  } catch (error) {
    this.indexerGateway.emitSystemStatus({
      message: `Indexing failed for ${tokenAddress}: ${error.message}`,
      stage: 'indexing-error',
      timestamp: new Date(),
    });
    
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

// Enhanced indexHotData with WebSocket updates:
async indexHotData(): Promise<void> {
  this.logger.log('🔥 Starting hot data indexing (100 records max per token)...');
  
  try {
    const latestBlock = await this.getLatestBlock();
    const hotDataBlocks = 50;
    const fromBlock = latestBlock - hotDataBlocks;

    this.indexerGateway.emitSystemStatus({
      message: `Starting hot data indexing: blocks ${fromBlock} to ${latestBlock}`,
      stage: 'hot-data-start',
      timestamp: new Date(),
    });

    this.logger.log(`🔥 Indexing last ${hotDataBlocks} blocks (${fromBlock} to ${latestBlock})`);

    const popularTokens = await this.prisma.token.findMany({
      where: { isPopular: true }
    });

    for (let i = 0; i < popularTokens.length; i++) {
      const token = popularTokens[i];
      const progressPercent = ((i + 1) / popularTokens.length) * 100;
      
      this.indexerGateway.emitSystemStatus({
        message: `Hot data indexing: ${token.symbol || token.address.slice(0, 8)}... (${i + 1}/${popularTokens.length})`,
        stage: 'hot-data-progress',
        timestamp: new Date(),
      });

      this.logger.log(`🔥 Indexing hot data for ${token.symbol || token.address} (${i + 1}/${popularTokens.length})`);
      
      try {
        await this.indexTransfers(token.address, fromBlock, latestBlock, 100);
        
        await this.prisma.token.update({
          where: { id: token.id },
          data: { lastIndexed: new Date() }
        });
        
        this.logger.log(`✅ Completed hot data indexing for ${token.symbol}`);
        
      } catch (error) {
        this.logger.error(`❌ Failed to index hot data for ${token.symbol}:`, error);
      }
    }

    this.indexerGateway.emitSystemStatus({
      message: 'Hot data indexing completed successfully',
      stage: 'hot-data-complete',
      timestamp: new Date(),
    });

    this.logger.log('✅ Hot data indexing completed');
    
  } catch (error) {
    this.indexerGateway.emitSystemStatus({
      message: `Hot data indexing failed: ${error.message}`,
      stage: 'hot-data-error',
      timestamp: new Date(),
    });
    
    this.logger.error('❌ Hot data indexing failed:', error);
    throw error;
  }
}

// Process individual transfer log
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
    const transfer = await this.prisma.transfer.create({
      data: {
        blockNumber: blockNumber,
        txHash: log.transactionHash,
        from: from.toLowerCase(),
        to: to.toLowerCase(),
        value: transferValue,
        tokenId: token.id,
        timestamp: new Date(block.timestamp * 1000),
        gasUsed,
        gasPrice,
        indexed: true,
        tier: 'hot'
      },
      include: {
        token: true // Include token details for WebSocket event
      }
    });

    // 🚀 EMIT WEBSOCKET EVENT FOR NEW TRANSFER
    this.indexerGateway.emitNewTransfer({
      id: transfer.id,
      txHash: transfer.txHash,
      from: transfer.from,
      to: transfer.to,
      value: transfer.value,
      token: {
        address: transfer.token.address,
        symbol: transfer.token.symbol,
        name: transfer.token.name,
      },
      blockNumber: transfer.blockNumber,
      timestamp: transfer.timestamp,
    });

    this.logger.log(`✅ Transfer processed and broadcast: ${log.transactionHash}`);
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