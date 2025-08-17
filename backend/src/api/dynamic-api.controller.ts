import { Controller, Get, Param, Query, NotFoundException, OnModuleInit } from '@nestjs/common';
import { DynamicApiService } from './dynamic-api.service';
import { Logger } from '@nestjs/common';

@Controller('api/dynamic') // Changed from 'api' to 'api/dynamic' to avoid conflicts
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
   * 📋 List all available dynamic endpoints
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
          example: 'GET /api/dynamic/usdc-transfers?limit=10&fromBlock=18000000',
          parameters: 'All endpoints support: limit, offset, sortBy, sortOrder, address, fromBlock, toBlock, minValue, maxValue'
        },
        timestamp: new Date(),
      };
      
    } catch (error) {
      this.logger.error('❌ Failed to list endpoints:', error);
      
      return {
        success: false,
        error: error.message,
        timestamp: new Date(),
      };
    }
  }

  /**
   * 🔍 Execute dynamic API endpoint
   * GET /api/dynamic/:endpoint
   */
  @Get(':endpoint')
  async executeDynamicEndpoint(
    @Param('endpoint') endpoint: string,
    @Query() queryParams: Record<string, any>
  ) {
    // Check if this is a static endpoint that should not be handled here
    if (this.staticEndpoints.includes(endpoint)) {
      this.logger.log(`🚫 Skipping static endpoint: ${endpoint} - should be handled by specific controller`);
      throw new NotFoundException({
        success: false,
        error: `Endpoint /api/dynamic/${endpoint} is a static endpoint`,
        message: 'This endpoint is handled by a specific controller, not the dynamic API system.',
        availableEndpoints: '/api/dynamic',
        timestamp: new Date(),
      });
    }

    const path = `/api/dynamic/${endpoint}`; // Updated path to match new route
    this.logger.log(`🔍 Executing dynamic endpoint: ${path}`);
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
