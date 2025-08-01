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
  async executeQuery(@Body() body: { query: string }) {
    const { query } = body;

    if (!query) {
      throw new Error('Query is required');
    }

    this.logger.log(`🚀 Executing query: "${query}"`);

    try {
      const result = await this.orchestratorService.executeAIQuery(query);
      
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

    const jobs = await this.orchestratorService.getAllJobs(limitNum, offsetNum);
    const activeJobsCount = await this.orchestratorService.getActiveJobsCount();

    return {
      success: true,
      jobs,
      pagination: {
        limit: limitNum,
        offset: offsetNum,
        total: jobs.length,
      },
      summary: {
        activeJobs: activeJobsCount,
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
}

