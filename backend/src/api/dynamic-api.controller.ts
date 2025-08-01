import { Controller, Get, Query, Param, Logger, NotFoundException } from '@nestjs/common';
import { DynamicApiService } from './dynamic-api.service';

@Controller('api')
export class DynamicApiController {
  private readonly logger = new Logger(DynamicApiController.name);

  constructor(private readonly dynamicApiService: DynamicApiService) {}

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
