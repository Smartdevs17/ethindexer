import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { AiService } from '../ai/ai.service';
import { IndexerService } from '../indexer/indexer.service';
import { IndexerGateway } from '../websocket/indexer.gateway';

export interface JobCreationResult {
  jobId: string;
  config: any;
  message: string;
}

export interface JobStatus {
  id: string;
  query: string;
  status: string;
  progress: number;
  createdAt: Date;
  updatedAt: Date;
  completedAt?: Date;
  config: any;
}

@Injectable()
export class OrchestratorService {
  private readonly logger = new Logger(OrchestratorService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly aiService: AiService,
    private readonly indexerService: IndexerService,
    private readonly indexerGateway: IndexerGateway,
  ) {}

  /**
   * Main orchestration method: Natural Language → AI → Job → Indexing
   */
  async executeAIQuery(query: string): Promise<any> {
    this.logger.log(`🚀 Executing AI query: "${query}"`);

    try {
      // Step 1: Parse natural language with AI
      this.indexerGateway.emitSystemStatus({
        message: 'Parsing query with AI...',
        stage: 'ai-parsing',
        timestamp: new Date(),
      });

      const config = await this.aiService.parseNaturalLanguageQuery(query);
      this.logger.log(`🧠 AI parsed config:`, config);

      // Step 2: Create indexing job
      const job = await this.prisma.indexingJob.create({
        data: {
          query,
          config: config as any,
          status: 'active',
          priority: 'normal',
          fromBlock: config.fromBlock?.toString(),
          toBlock: config.toBlock?.toString(),
          addresses: config.addresses || [],
          events: config.events || ['Transfer'],
          progress: 0,
          blocksProcessed: '0',
        },
      });

      this.logger.log(`📋 Created job ${job.id}`);

      // Step 3: Emit job creation event
      this.indexerGateway.emitJobProgress({
        jobId: job.id,
        progress: 0,
        status: 'active',
        message: 'Job created, starting indexing...',
        timestamp: new Date(),
      });

      this.indexerGateway.emitSystemStatus({
        message: `New indexing job created: ${job.id}`,
        stage: 'job-created',
        jobId: job.id,
        timestamp: new Date(),
      });

      // Step 4: Start indexing in background
      this.startIndexingJob(job.id).catch((error) => {
        this.logger.error(`❌ Background indexing failed for job ${job.id}:`, error);
      });

      // Return with API URL and description
      return {
        result: {
          jobId: job.id,
          message: 'Indexing job created successfully',
          config: config,
          apiUrl: await this.generateApiUrl(config, query),
          description: this.generateDescription(config, query)
        }
      };

    } catch (error) {
      this.logger.error(`❌ Failed to execute AI query:`, error);
      
      this.indexerGateway.emitSystemStatus({
        message: `Failed to process query: ${error.message}`,
        stage: 'error',
        timestamp: new Date(),
      });

      throw error;
    }
  }

  /**
   * Generate API URL based on indexing config
   */
  private async generateApiUrl(config: any, query: string): Promise<string> {
    let endpointName = 'transfers';
    if (config.tokenSymbol) {
      endpointName = `${config.tokenSymbol.toLowerCase()}-transfers`;
    } else if (config.addresses && config.addresses.length === 1) {
      const address = config.addresses[0];
      // Try to get token symbol from database
      const token = await this.prisma.token.findUnique({
        where: { address: address.toLowerCase() }
      });
      if (token) {
        endpointName = `${token.symbol.toLowerCase()}-transfers`;
      }
    }
    return `/api/${endpointName}`;
  }

  /**
   * Generate human-readable description
   */
  private generateDescription(config: any, query: string): string {
    if (config.tokenSymbol) {
      return `${config.tokenSymbol} transfer data`;
    } else if (config.addresses && config.addresses.length === 1) {
      return `Transfer data for token ${config.addresses[0].slice(0, 6)}...`;
    } else {
      return `Transfer data from query: ${query}`;
    }
  }

  /**
   * Execute indexing job with progress tracking
   */
  private async startIndexingJob(jobId: string): Promise<void> {
    this.logger.log(`🔄 Starting indexing job ${jobId}`);

    try {
      const job = await this.prisma.indexingJob.findUnique({
        where: { id: jobId },
      });

      if (!job) {
        throw new Error(`Job ${jobId} not found`);
      }

      const config = job.config as any;

      // Generate API URL immediately when job starts
      const apiUrl = await this.generateApiUrl(config, job.query);
      const description = this.generateDescription(config, job.query);
      
      // Emit API URL immediately to frontend
      this.indexerGateway.emitApiCreated({
        jobId: jobId,
        path: apiUrl,
        query: job.query,
        description: description,
        timestamp: new Date(),
      });

      this.logger.log(`🔗 Generated API URL for job ${jobId}: ${apiUrl}`);

      // Update job status to processing
      await this.updateJobProgress(jobId, 10, 'Processing configuration...');

      // If addresses specified, index those tokens
      if (config.addresses && config.addresses.length > 0) {
        await this.indexTokenAddresses(jobId, config);
      } else {
        // If no addresses, use popular tokens or fallback logic
        await this.indexPopularTokens(jobId, config);
      }

      // Mark job as completed
      await this.prisma.indexingJob.update({
        where: { id: jobId },
        data: {
          status: 'completed',
          progress: 100,
          completedAt: new Date(),
        },
      });

      this.indexerGateway.emitJobProgress({
        jobId,
        progress: 100,
        status: 'completed',
        message: 'Indexing completed successfully!',
        timestamp: new Date(),
      });

      this.indexerGateway.emitSystemStatus({
        message: `Job ${jobId} completed successfully`,
        stage: 'job-completed',
        jobId,
        timestamp: new Date(),
      });

      this.logger.log(`✅ Job ${jobId} completed successfully`);

    } catch (error) {
      this.logger.error(`❌ Job ${jobId} failed:`, error);

      await this.prisma.indexingJob.update({
        where: { id: jobId },
        data: {
          status: 'error',
          completedAt: new Date(),
        },
      });

      this.indexerGateway.emitJobProgress({
        jobId,
        progress: 0,
        status: 'error',
        message: `Job failed: ${error.message}`,
        timestamp: new Date(),
      });
    }
  }

  /**
   * Index specific token addresses
   */
  private async indexTokenAddresses(jobId: string, config: any): Promise<void> {
    const addresses = config.addresses;
    const totalAddresses = addresses.length;

    await this.updateJobProgress(jobId, 20, `Starting indexing for ${totalAddresses} tokens...`);

    for (let i = 0; i < addresses.length; i++) {
      const address = addresses[i];
      const progressPercent = 20 + ((i + 1) / totalAddresses) * 70; // 20% to 90%

      try {
        this.logger.log(`🔍 Indexing token ${i + 1}/${totalAddresses}: ${address}`);
        
        await this.updateJobProgress(
          jobId,
          progressPercent,
          `Indexing token ${i + 1}/${totalAddresses}: ${address.slice(0, 8)}...`
        );

        // Index the token transfers
        const processedCount = await this.indexerService.indexTransfers(
          address,
          config.fromBlock,
          config.toBlock,
          100 // Limit to 100 records
        );

        // Update job with blocks processed
        const currentJob = await this.prisma.indexingJob.findUnique({ where: { id: jobId } });
        const newBlocksProcessed = (parseInt(currentJob?.blocksProcessed || '0') + processedCount).toString();
        
        await this.prisma.indexingJob.update({
          where: { id: jobId },
          data: { blocksProcessed: newBlocksProcessed },
        });

        this.logger.log(`✅ Processed ${processedCount} transfers for ${address}`);

      } catch (error) {
        this.logger.error(`❌ Failed to index ${address}:`, error);
        await this.updateJobProgress(
          jobId,
          progressPercent,
          `Failed to index ${address.slice(0, 8)}..., continuing...`
        );
      }
    }

    await this.updateJobProgress(jobId, 90, 'Finalizing indexing...');
  }

  /**
   * Index popular tokens when no specific addresses provided
   */
  private async indexPopularTokens(jobId: string, config: any): Promise<void> {
    await this.updateJobProgress(jobId, 30, 'Getting popular tokens...');

    const popularTokens = await this.prisma.token.findMany({
      where: { isPopular: true },
      take: 5, // Limit to top 5 popular tokens
    });

    if (popularTokens.length === 0) {
      await this.updateJobProgress(jobId, 50, 'No popular tokens found, indexing hot data...');
      await this.indexerService.indexHotData();
      return;
    }

    await this.updateJobProgress(jobId, 40, `Indexing ${popularTokens.length} popular tokens...`);

    for (let i = 0; i < popularTokens.length; i++) {
      const token = popularTokens[i];
      const progressPercent = 40 + ((i + 1) / popularTokens.length) * 50; // 40% to 90%

      try {
        await this.updateJobProgress(
          jobId,
          progressPercent,
          `Indexing ${token.symbol || token.address.slice(0, 8)}...`
        );

        const processedCount = await this.indexerService.indexTransfers(
          token.address,
          config.fromBlock,
          config.toBlock,
          100
        );

        this.logger.log(`✅ Processed ${processedCount} transfers for ${token.symbol}`);

      } catch (error) {
        this.logger.error(`❌ Failed to index ${token.address}:`, error);
      }
    }
  }

  /**
   * Update job progress and emit WebSocket event
   */
  private async updateJobProgress(jobId: string, progress: number, message: string): Promise<void> {
    await this.prisma.indexingJob.update({
      where: { id: jobId },
      data: {
        progress,
        updatedAt: new Date(),
      },
    });

    this.indexerGateway.emitJobProgress({
      jobId,
      progress,
      status: 'active',
      message,
      timestamp: new Date(),
    });

    this.logger.log(`📊 Job ${jobId}: ${progress}% - ${message}`);
  }

  /**
   * Get job status by ID
   */
  async getJobStatus(jobId: string): Promise<JobStatus | null> {
    const job = await this.prisma.indexingJob.findUnique({
      where: { id: jobId },
    });

    if (!job) {
      return null;
    }

    return {
      id: job.id,
      query: job.query,
      status: job.status,
      progress: job.progress,
      createdAt: job.createdAt,
      updatedAt: job.updatedAt,
      completedAt: job.completedAt,
      config: job.config,
    };
  }

  /**
   * Get all jobs with pagination
   */
  async getAllJobs(limit = 20, offset = 0): Promise<JobStatus[]> {
    const jobs = await this.prisma.indexingJob.findMany({
      take: limit,
      skip: offset,
      orderBy: { createdAt: 'desc' },
    });

    return jobs.map(job => ({
      id: job.id,
      query: job.query,
      status: job.status,
      progress: job.progress,
      createdAt: job.createdAt,
      updatedAt: job.updatedAt,
      completedAt: job.completedAt,
      config: job.config,
    }));
  }

  /**
   * Get active jobs count
   */
  async getActiveJobsCount(): Promise<number> {
    return this.prisma.indexingJob.count({
      where: { status: 'active' },
    });
  }
}