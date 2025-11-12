import { Controller, Get, Param, Query, NotFoundException, OnModuleInit, Req } from '@nestjs/common';
import { Request } from 'express';
import { DynamicApiService } from './dynamic-api.service';
import { Logger } from '@nestjs/common';

@Controller('api/dynamic')
export class DynamicApiController implements OnModuleInit {
  private readonly logger = new Logger(DynamicApiController.name);
  
  // Define static endpoints that should not be handled by this controller
  private readonly staticEndpoints = [
    'blocks',
    'live-data',
    'users',
    'orchestrator',
    'indexer',
    'chat',
    'ai',
    'tokens'
  ];

  constructor(private readonly dynamicApiService: DynamicApiService) {}

  async onModuleInit() {
    // Initialize default endpoints when the module starts
    await this.dynamicApiService.initializeDefaultEndpoints();
  }

  /**
   * List all available dynamic endpoints
   * GET /api/dynamic
   */
  @Get()
  async listEndpoints() {
    try {
      const endpoints = await this.dynamicApiService.listAvailableEndpoints();
      
      return {
        success: true,
        endpoints,
        count: endpoints.length,
        message: 'Available dynamic API endpoints',
        usage: {
          example: 'GET /api/dynamic/transfers?job_id=xxx&limit=10&fromBlock=18000000',
          parameters: 'All endpoints support: job_id (required for job-specific queries), limit, offset, sortBy, sortOrder, address, fromBlock, toBlock, minValue, maxValue, token'
        },
        timestamp: new Date(),
      };
      
    } catch (error) {
      this.logger.error('Failed to list endpoints:', error);
      
      return {
        success: false,
        error: error.message,
        timestamp: new Date(),
      };
    }
  }

  /**
   * Execute transfers endpoint with job_id query parameter
   * GET /api/dynamic/transfers?job_id=xxx
   */
  @Get('transfers')
  async executeTransfersEndpoint(
    @Query() queryParams: Record<string, any>
  ) {
    const path = '/api/dynamic/transfers';
    this.logger.log(`Executing transfers endpoint: ${path}`);
    this.logger.debug(`Query parameters:`, queryParams);

    try {
      const result = await this.dynamicApiService.executeDynamicApi(path, queryParams);
      
      return {
        ...result,
        timestamp: new Date(),
      };
      
    } catch (error) {
      this.logger.error(`❌ Failed to execute ${path}:`, error);
      
      if (error.message.includes('not found')) {
        throw new NotFoundException({
          success: false,
          error: `Endpoint ${path} not found`,
          message: 'This endpoint has not been generated yet. Create it by running an indexing query.',
          availableEndpoints: '/api/dynamic',
          timestamp: new Date(),
        });
      }
      
      return {
        success: false,
        error: error.message,
        endpoint: path,
        timestamp: new Date(),
      };
    }
  }

  /**
   * Execute dynamic API endpoint (fallback for other endpoints)
   * GET /api/dynamic/:endpoint
   */
  @Get('*')
  async executeDynamicEndpoint(
    @Req() req: Request,
    @Query() queryParams: Record<string, any>
  ) {
    const fullPath = req.originalUrl.split('?')[0];
    const path = fullPath;
    
    const pathAfterBase = fullPath.replace(/^\/api\/dynamic\/?/, '');
    const pathSegments = pathAfterBase.split('/').filter(Boolean);
    const firstSegment = pathSegments[0];
    
    if (firstSegment && this.staticEndpoints.includes(firstSegment)) {
      this.logger.log(`Skipping static endpoint: ${firstSegment} - should be handled by specific controller`);
      throw new NotFoundException({
        success: false,
        error: `Endpoint ${path} is a static endpoint`,
        message: 'This endpoint is handled by a specific controller, not the dynamic API system.',
        availableEndpoints: '/api/dynamic',
        timestamp: new Date(),
      });
    }

    this.logger.log(`Executing dynamic endpoint: ${path}`);
    this.logger.debug(`Query parameters:`, queryParams);

    try {
      const result = await this.dynamicApiService.executeDynamicApi(path, queryParams);
      
      return {
        ...result,
        timestamp: new Date(),
      };
      
    } catch (error) {
      this.logger.error(`❌ Failed to execute ${path}:`, error);
      
      if (error.message.includes('not found')) {
        throw new NotFoundException({
          success: false,
          error: `Endpoint ${path} not found`,
          message: 'This endpoint has not been generated yet. Create it by running an indexing query.',
          availableEndpoints: '/api/dynamic',
          timestamp: new Date(),
        });
      }
      
      return {
        success: false,
        error: error.message,
        endpoint: path,
        timestamp: new Date(),
      };
    }
  }
}
