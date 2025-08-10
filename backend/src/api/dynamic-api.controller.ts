import { Controller, Get, Param, Query, NotFoundException, OnModuleInit } from '@nestjs/common';
import { DynamicApiService } from './dynamic-api.service';
import { Logger } from '@nestjs/common';

@Controller('api')
export class DynamicApiController implements OnModuleInit {
  private readonly logger = new Logger(DynamicApiController.name);

  constructor(private readonly dynamicApiService: DynamicApiService) {}

  async onModuleInit() {
    // Initialize default endpoints when the module starts
    await this.dynamicApiService.initializeDefaultEndpoints();
  }

  /**
   * 📋 List all available dynamic endpoints
   * GET /api
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
          example: 'GET /api/usdc-transfers?limit=10&fromBlock=18000000',
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
   * GET /api/:endpoint
   */
  @Get(':endpoint')
  async executeDynamicEndpoint(
    @Param('endpoint') endpoint: string,
    @Query() queryParams: Record<string, any>
  ) {
    const path = `/api/${endpoint}`;
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
          availableEndpoints: '/api',
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
