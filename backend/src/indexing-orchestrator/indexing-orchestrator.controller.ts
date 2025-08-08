import { Controller, Post, Get, Body, Param, Query, Logger } from '@nestjs/common';
import { IndexingOrchestratorService } from './indexing-orchestrator.service';
import { IndexingJobResult } from './indexing-orchestrator.interface';

@Controller('orchestrator')
export class IndexingOrchestratorController {
  private readonly logger = new Logger(IndexingOrchestratorController.name);

  constructor(
    private readonly orchestratorService: IndexingOrchestratorService,
  ) {}

  /**
   * 🎯 Main endpoint: Process natural language query
   * POST /orchestrator/execute
   */
  @Post('execute')
  async executeQuery(@Body() body: { query: string }) {
    const { query } = body;
    
    if (!query) {
      return {
        error: 'Query is required',
        example: 'Index USDC transfers from block 18000000'
      };
    }

    this.logger.log(`🎯 Executing query: "${query}"`);
    
    try {
      const result = await this.orchestratorService.executeNaturalLanguageQuery(query);
      
      return {
        success: true,
        result,
        timestamp: new Date(),
        nextSteps: {
          checkStatus: `/orchestrator/job/${result.jobId}`,
          listJobs: '/orchestrator/jobs'
        }
      };
      
    } catch (error) {
      this.logger.error('❌ Query execution failed:', error);
      
      return {
        success: false,
        error: error.message,
        query,
        timestamp: new Date()
      };
    }
  }

  /**
   * 📊 Get job status
   * GET /orchestrator/job/:jobId
   */
  @Get('job/:jobId')
  async getJobStatus(@Param('jobId') jobId: string) {
    try {
      const job = await this.orchestratorService.getJobStatus(jobId);
      
      if (!job) {
        return {
          success: false,
          error: `Job ${jobId} not found`,
          timestamp: new Date()
        };
      }

      return {
        success: true,
        job,
        timestamp: new Date()
      };
      
    } catch (error) {
      this.logger.error(`❌ Failed to get job status for ${jobId}:`, error);
      
      return {
        success: false,
        error: error.message,
        jobId,
        timestamp: new Date()
      };
    }
  }

  /**
   * 📋 List all jobs
   * GET /orchestrator/jobs
   */
  @Get('jobs')
  async listJobs(@Query('limit') limit?: string): Promise<{
    success: boolean;
    jobs: IndexingJobResult[];
    count: number;
    timestamp: Date;
    error?: string;
  }> {
    try {
      const jobLimit = limit ? parseInt(limit) : 10;
      const jobs = await this.orchestratorService.listJobs(jobLimit);
      
      return {
        success: true,
        jobs,
        count: jobs.length,
        timestamp: new Date()
      };
      
    } catch (error) {
      this.logger.error('❌ Failed to list jobs:', error);
      
      return {
        success: false,
        jobs: [],
        count: 0,
        error: error.message,
        timestamp: new Date()
      };
    }
  }

  /**
   * 🧪 Test endpoint: Parse query without executing
   * POST /orchestrator/parse-only
   */
  @Post('parse-only')
  async parseOnly(@Body() body: { query: string }) {
    const { query } = body;
    
    if (!query) {
      return {
        error: 'Query is required',
        example: 'Index USDC transfers from block 18000000'
      };
    }

    try {
      // We'll create a simple parse-only method
      return {
        success: true,
        message: 'Parse-only mode - use /ai/parse-query for direct AI parsing',
        suggestion: {
          endpoint: '/ai/parse-query',
          method: 'POST',
          body: { query }
        },
        timestamp: new Date()
      };
      
    } catch (error) {
      return {
        success: false,
        error: error.message,
        timestamp: new Date()
      };
    }
  }

  /**
   * 📊 Get orchestrator stats
   * GET /orchestrator/stats
   */
  @Get('stats')
  async getStats() {
    try {
      // Basic stats for now - can be enhanced later
      return {
        success: true,
        stats: {
          message: 'Orchestrator is running',
          endpoints: {
            execute: 'POST /orchestrator/execute',
            jobStatus: 'GET /orchestrator/job/:jobId',
            listJobs: 'GET /orchestrator/jobs',
            parseOnly: 'POST /orchestrator/parse-only'
          }
        },
        timestamp: new Date()
      };
      
    } catch (error) {
      return {
        success: false,
        error: error.message,
        timestamp: new Date()
      };
    }
  }
}

