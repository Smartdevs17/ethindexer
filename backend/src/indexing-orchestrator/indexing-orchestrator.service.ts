import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { IndexerService } from '../indexer/indexer.service';
import { AiService, IndexingConfig } from '../ai/ai.service';
import { ethers } from 'ethers';
import { DynamicApiService } from '../api/dynamic-api.service';

interface IndexingJobResult {
  jobId: string;
  status: 'pending' | 'active' | 'completed' | 'error' | 'paused';
  message: string;
  config: IndexingConfig;
  progress: number;
  processedRecords: number;
  estimatedBlocks?: number;
  
  timestamp: Date;      // Primary timestamp for UI display
  createdAt: Date;      // Job creation time
  updatedAt: Date;      // Last update time
  completedAt?: Date;   // Completion time (optional)
}

@Injectable()
export class IndexingOrchestratorService {
  private readonly logger = new Logger(IndexingOrchestratorService.name);
  
  private readonly TOKEN_ADDRESSES = {
    'usdc': '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48',
    'usdt': '0xdAC17F958D2ee523a2206206994597C13D831ec7', 
    'weth': '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2',
  };

  constructor(
    private readonly prisma: PrismaService,
    private readonly indexerService: IndexerService,
    private readonly aiService: AiService,
    private readonly dynamicApiService: DynamicApiService,
  ) {
    // 🔧 Validate addresses on startup
    this.validateTokenAddresses();
  }

  /**
   * 🔧 NEW: Validate token addresses on startup
   */
  private validateTokenAddresses() {
    for (const [symbol, address] of Object.entries(this.TOKEN_ADDRESSES)) {
      try {
        const checksummed = ethers.getAddress(address);
        if (checksummed !== address) {
          this.logger.warn(`⚠️ Address for ${symbol.toUpperCase()} not properly checksummed`);
          this.logger.warn(`   Expected: ${checksummed}`);
          this.logger.warn(`   Got: ${address}`);
        } else {
          this.logger.log(`✅ ${symbol.toUpperCase()} address valid: ${address}`);
        }
      } catch (error) {
        this.logger.error(`❌ Invalid address for ${symbol.toUpperCase()}: ${address}`);
        this.logger.error(`   Error: ${error.message}`);
      }
    }
  }

  /**
   * Main orchestration method: Parse natural language query and start indexing
   */
  async executeNaturalLanguageQuery(query: string): Promise<IndexingJobResult> {
    this.logger.log(`🎯 Processing query: "${query}"`);

    try {
      // Step 1: Parse with AI
      const config = await this.aiService.parseNaturalLanguageQuery(query);
      this.logger.log('🤖 AI parsing complete:', config);

      // Step 2: Resolve token addresses from config (with proper checksumming)
      const resolvedConfig = await this.resolveTokenAddresses(config);
      this.logger.log('🔍 Token resolution complete:', resolvedConfig);

      // Step 3: Create indexing job
      const job = await this.createIndexingJob(resolvedConfig);
      this.logger.log(`📝 Created job ${job.id}`);

      // Step 4: Execute indexing (async)
      this.executeIndexingJob(job.id).catch(error => {
        this.logger.error(`❌ Job ${job.id} failed:`, error);
        this.updateJobStatus(job.id, 'error', error.message);
      });

      return {
        jobId: job.id,
        status: 'pending',
        message: 'Indexing job created and started',
        config: resolvedConfig,
        progress: 0,
        processedRecords: 0,
        estimatedBlocks: this.calculateEstimatedBlocks(resolvedConfig),
        timestamp: job.updatedAt || job.createdAt,
        createdAt: job.createdAt,
        updatedAt: job.updatedAt,
        completedAt: job.completedAt,
      };

    } catch (error) {
      this.logger.error('❌ Failed to execute query:', error);
      throw new Error(`Failed to process query: ${error.message}`);
    }
  }

  /**
   * 🔧 IMPROVED: Resolve token names to addresses with proper checksumming
   */
  private async resolveTokenAddresses(config: IndexingConfig): Promise<IndexingConfig> {
    const resolvedAddresses = [...config.addresses];
    
    // Check if query mentions popular tokens by name
    const queryLower = config.originalQuery.toLowerCase();
    
    for (const [tokenName, address] of Object.entries(this.TOKEN_ADDRESSES)) {
      if (queryLower.includes(tokenName) && !resolvedAddresses.some(addr => 
        addr.toLowerCase() === address.toLowerCase())) {
        
        try {
          // 🔧 Ensure proper checksumming
          const checksummedAddress = ethers.getAddress(address);
          resolvedAddresses.push(checksummedAddress);
          this.logger.log(`✅ Resolved ${tokenName.toUpperCase()} to ${checksummedAddress}`);
        } catch (error) {
          this.logger.error(`❌ Invalid address for ${tokenName}: ${address}`);
        }
      }
    }

    // 🔧 Validate and checksum any existing addresses
    const validatedAddresses = [];
    for (const addr of resolvedAddresses) {
      try {
        const checksummed = ethers.getAddress(addr);
        validatedAddresses.push(checksummed);
      } catch (error) {
        this.logger.error(`❌ Invalid address skipped: ${addr}`);
      }
    }

    return {
      ...config,
      addresses: validatedAddresses,
    };
  }

  /**
   * Create indexing job record in database
   */
  private async createIndexingJob(config: IndexingConfig) {
    const job = await this.prisma.indexingJob.create({
      data: {
        query: config.originalQuery,
        config: config as any, // Prisma Json type
        status: 'active',
        priority: this.determinePriority(config),
        tier: this.determineTier(config),
        fromBlock: config.fromBlock?.toString() || null,
        toBlock: config.toBlock?.toString() || null,
        addresses: config.addresses,
        events: config.events,
        progress: 0,
        blocksProcessed: '0',
        estimatedBlocks: this.calculateEstimatedBlocks(config)?.toString() || null,
      },
    });

    return job;
  }

  /**
   * Execute the actual indexing job
   */
  private async executeIndexingJob(jobId: string): Promise<void> {
    this.logger.log(`🚀 Starting execution of job ${jobId}`);

    try {
      const job = await this.prisma.indexingJob.findUnique({
        where: { id: jobId },
      });

      if (!job) {
        throw new Error(`Job ${jobId} not found`);
      }

      const config = job.config as unknown as IndexingConfig;
      let totalProcessed = 0;

      // Update job status to active
      await this.updateJobStatus(jobId, 'active', 'Indexing in progress...');

      // Handle different indexing scenarios
      if (config.addresses.length > 0) {
        // Address-specific indexing
        for (const address of config.addresses) {
          this.logger.log(`🔍 Indexing transfers for address: ${address}`);
          
          try {
            const processed = await this.indexerService.indexTransfers(
              address, // Address is already checksummed
              config.fromBlock || undefined,
              config.toBlock || undefined,
              100 // Max records per token
            );
            
            totalProcessed += processed;
            
            // Update progress
            const progress = (config.addresses.indexOf(address) + 1) / config.addresses.length * 100;
            await this.updateJobProgress(jobId, progress, totalProcessed);
            
          } catch (addressError) {
            this.logger.error(`❌ Failed to index ${address}:`, addressError);
            // Continue with other addresses
          }
        }
      } else {
        // General indexing - use popular tokens from database
        this.logger.log('🔥 No specific addresses, indexing popular tokens');
        
        const popularTokens = await this.prisma.token.findMany({
          where: { isPopular: true },
        });

        for (const token of popularTokens) {
          try {
            const processed = await this.indexerService.indexTransfers(
              token.address,
              config.fromBlock || undefined,
              config.toBlock || undefined,
              100
            );
            
            totalProcessed += processed;
            
            const progress = (popularTokens.indexOf(token) + 1) / popularTokens.length * 100;
            await this.updateJobProgress(jobId, progress, totalProcessed);
            
          } catch (tokenError) {
            this.logger.error(`❌ Failed to index token ${token.symbol}:`, tokenError);
            // Continue with other tokens
          }
        }
      }

      // Mark job as completed
      await this.updateJobStatus(jobId, 'completed', `Successfully indexed ${totalProcessed} transfers`);
      await this.updateJobProgress(jobId, 100, totalProcessed);

      // 🔥 NEW: Auto-generate API endpoint for completed job
      this.logger.log(`🔧 Auto-generating API endpoint for job ${jobId}`);
      const apiEndpoint = await this.dynamicApiService.generateApiFromJob(jobId);
      if (apiEndpoint) {
        this.logger.log(`✅ Generated API endpoint: ${apiEndpoint.path}`);
      } else {
        this.logger.warn(`⚠️ Failed to generate API endpoint for job ${jobId}`);
      }

      this.logger.log(`✅ Job ${jobId} completed. Processed ${totalProcessed} transfers`);

    } catch (error) {
      this.logger.error(`❌ Job ${jobId} failed:`, error);
      await this.updateJobStatus(jobId, 'error', error.message);
      throw error;
    }
  }

  /**
   * Update job status
   */
  private async updateJobStatus(jobId: string, status: string, message?: string): Promise<void> {
    await this.prisma.indexingJob.update({
      where: { id: jobId },
      data: {
        status,
        updatedAt: new Date(),
        ...(status === 'completed' && { completedAt: new Date() }),
      },
    });

    if (message) {
      this.logger.log(`📊 Job ${jobId}: ${message}`);
    }
  }

  /**
   * Update job progress
   */
  private async updateJobProgress(jobId: string, progress: number, processedRecords: number): Promise<void> {
    await this.prisma.indexingJob.update({
      where: { id: jobId },
      data: {
        progress: Math.round(progress),
        blocksProcessed: processedRecords.toString(),
        updatedAt: new Date(),
      },
    });

    this.logger.log(`📊 Job ${jobId}: ${Math.round(progress)}% complete (${processedRecords} records)`);
  }

  /**
   * Get job status
   */
  async getJobStatus(jobId: string): Promise<IndexingJobResult | null> {
    const job = await this.prisma.indexingJob.findUnique({
      where: { id: jobId },
    });

    if (!job) return null;

    return {
      jobId: job.id,
      status: job.status as any,
      message: this.getStatusMessage(job),
      config: job.config as unknown as IndexingConfig,
      progress: job.progress,
      processedRecords: parseInt(job.blocksProcessed),
      estimatedBlocks: job.estimatedBlocks ? parseInt(job.estimatedBlocks) : undefined,
      timestamp: job.updatedAt || job.createdAt,
      createdAt: job.createdAt,
      updatedAt: job.updatedAt,
      completedAt: job.completedAt,
    };
  }

/**
 * List all jobs with timestamp fields included
 */
async listJobs(limit: number = 10): Promise<IndexingJobResult[]> {
  const jobs = await this.prisma.indexingJob.findMany({
    orderBy: { createdAt: 'desc' },
    take: limit,
  });

  return jobs.map(job => ({
    jobId: job.id,
    status: job.status as any,
    message: this.getStatusMessage(job),
    config: job.config as unknown as IndexingConfig,
    progress: job.progress,
    processedRecords: parseInt(job.blocksProcessed),
    estimatedBlocks: job.estimatedBlocks ? parseInt(job.estimatedBlocks) : undefined,
    
    // ✅ ADD THESE MISSING TIMESTAMP FIELDS:
    timestamp: job.updatedAt || job.createdAt,  // Use updatedAt as primary timestamp
    createdAt: job.createdAt,                   // When job was created
    updatedAt: job.updatedAt,                   // When job was last updated
    completedAt: job.completedAt,               // When job was completed (if applicable)
  }));
}

  // Helper methods
  private determinePriority(config: IndexingConfig): string {
    if (config.addresses.length > 0) return 'high';
    if (config.fromBlock && config.toBlock) return 'normal';
    return 'low';
  }

  private determineTier(config: IndexingConfig): string {
    const queryLower = config.originalQuery.toLowerCase();
    if (queryLower.includes('hot') || queryLower.includes('recent') || queryLower.includes('latest')) return 'hot';
    if (queryLower.includes('cold') || queryLower.includes('archive')) return 'cold';
    return 'warm';
  }

  private calculateEstimatedBlocks(config: IndexingConfig): number | null {
    if (config.fromBlock && config.toBlock) {
      return config.toBlock - config.fromBlock;
    }
    if (config.fromBlock && !config.toBlock) {
      return 1000; // Estimate recent blocks
    }
    return null;
  }

  private getStatusMessage(job: any): string {
    switch (job.status) {
      case 'active': return `Indexing in progress... ${job.progress}% complete`;
      case 'completed': return `Completed successfully. Processed ${job.blocksProcessed} records`;
      case 'error': return 'Indexing failed';
      case 'paused': return 'Indexing paused';
      default: return 'Unknown status';
    }
  }
}