import { Controller, Post, Get, Body, Param, Query, Logger } from '@nestjs/common';
import { OrchestratorService } from './orchestrator.service';

@Controller('orchestrator')
export class OrchestratorController {
  private readonly logger = new Logger(OrchestratorController.name);

  constructor(private readonly orchestratorService: OrchestratorService) {}

  /**
   * Main AI-powered execution endpoint
   * POST /orchestrator/execute
   */
  @Post('execute')
  async executeQuery(@Body() body: { query: string; userAddress?: string }) {
    const { query, userAddress } = body;

    if (!query) {
      throw new Error('Query is required');
    }

    this.logger.log(`🚀 Executing query: "${query}"${userAddress ? ` for user: ${userAddress}` : ''}`);

    try {
      const result = await this.orchestratorService.executeAIQuery(query, userAddress);
      
      return {
        success: true,
        ...result,
        timestamp: new Date(),
      };
    } catch (error) {
      this.logger.error(`❌ Query execution failed:`, error);
      throw error;
    }
  }

  /**
   * Get specific job status
   * GET /orchestrator/job/:jobId
   */
  @Get('job/:jobId')
  async getJobStatus(@Param('jobId') jobId: string) {
    const job = await this.orchestratorService.getJobStatus(jobId);
    
    if (!job) {
      return {
        success: false,
        message: `Job ${jobId} not found`,
        timestamp: new Date(),
      };
    }

    return {
      success: true,
      job,
      timestamp: new Date(),
    };
  }

  /**
   * Get all jobs with pagination
   * GET /orchestrator/jobs?limit=20&offset=0
   */
  @Get('jobs')
  async getAllJobs(
    @Query('limit') limit?: string,
    @Query('offset') offset?: string
  ) {
    const limitNum = parseInt(limit) || 20;
    const offsetNum = parseInt(offset) || 0;

    const { jobs, total } = await this.orchestratorService.getAllJobs(limitNum, offsetNum);
    const activeJobsCount = await this.orchestratorService.getActiveJobsCount();

    return {
      success: true,
      jobs,
      pagination: {
        limit: limitNum,
        offset: offsetNum,
        total: total,
        hasMore: offsetNum + limitNum < total,
      },
      summary: {
        activeJobs: activeJobsCount,
        totalJobs: total,
        totalReturned: jobs.length,
      },
      timestamp: new Date(),
    };
  }

  /**
   * Get orchestrator statistics
   * GET /orchestrator/stats
   */
  @Get('stats')
  async getStats() {
    const activeJobsCount = await this.orchestratorService.getActiveJobsCount();
    
    return {
      success: true,
      stats: {
        activeJobs: activeJobsCount,
        timestamp: new Date(),
      },
    };
  }

  /**
   * Cancel a specific job
   * POST /orchestrator/job/:jobId/cancel
   */
  @Post('job/:jobId/cancel')
  async cancelJob(
    @Param('jobId') jobId: string,
    @Body() body?: { reason?: string }
  ) {
    try {
      const cancelled = await this.orchestratorService.cancelJob(jobId, body?.reason);
      
      return {
        success: true,
        message: `Job ${jobId} cancelled successfully`,
        timestamp: new Date(),
      };
    } catch (error) {
      this.logger.error(`❌ Failed to cancel job ${jobId}:`, error);
      return {
        success: false,
        message: error.message || 'Failed to cancel job',
        timestamp: new Date(),
      };
    }
  }

  /**
   * Cleanup stuck jobs (mark active jobs older than X hours as failed)
   * POST /orchestrator/cleanup?maxAgeHours=24
   */
  @Post('cleanup')
  async cleanupStuckJobs(@Query('maxAgeHours') maxAgeHours?: string) {
    try {
      const hours = maxAgeHours ? parseInt(maxAgeHours) : 24;
      const result = await this.orchestratorService.cleanupStuckJobs(hours);
      
      return {
        success: true,
        cleaned: result.cleaned,
        jobIds: result.jobs,
        message: `Cleaned up ${result.cleaned} stuck job(s)`,
        timestamp: new Date(),
      };
    } catch (error) {
      this.logger.error(`❌ Failed to cleanup stuck jobs:`, error);
      return {
        success: false,
        message: error.message || 'Failed to cleanup stuck jobs',
        timestamp: new Date(),
      };
    }
  }
}

