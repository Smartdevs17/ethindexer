import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { IndexingConfig } from '../ai/ai.service';
import { IndexerGateway } from 'src/websocket/indexer.gateway';

export interface ApiEndpointConfig {
  path: string;
  method: 'GET' | 'POST';
  description: string;
  parameters: Record<string, any>;
  filters: Record<string, any>;
  sqlQuery: string;
  cacheTime: number;
}

export interface DynamicApiResponse {
  success: boolean;
  data: any[];
  pagination: {
    limit: number;
    offset: number;
    total: number;
  };
  metadata: {
    endpoint: string;
    generatedAt: string;
    query: string;
  };
}

@Injectable()
export class DynamicApiService {
  private readonly logger = new Logger(DynamicApiService.name);

  constructor(
    private readonly prisma: PrismaService,     
    private readonly indexerGateway: IndexerGateway,
) {}

  /**
   * 🔥 Main method: Generate API endpoint from completed indexing job
   */
  async generateApiFromJob(jobId: string): Promise<ApiEndpointConfig | null> {
    this.logger.log(`🔧 Generating API endpoint for job ${jobId}`);

    try {
      // Get completed job
      const job = await this.prisma.indexingJob.findUnique({
        where: { id: jobId },
      });

      if (!job || job.status !== 'completed') {
        this.logger.warn(`❌ Job ${jobId} not found or not completed`);
        return null;
      }

      const config = job.config as unknown as IndexingConfig;

      // Generate endpoint configuration
      const endpointConfig = await this.createEndpointConfig(config, job);
      
  // Store in database
  await this.storeApiEndpoint(endpointConfig, config);
  // Also create API endpoint and emit websocket event with jobId
  await this.createApiEndpoint(jobId, endpointConfig.path, config.originalQuery, endpointConfig.sqlQuery);
  this.logger.log(`✅ Generated API endpoint: ${endpointConfig.path}`);
  return endpointConfig;

    } catch (error) {
      this.logger.error(`❌ Failed to generate API for job ${jobId}:`, error);
      return null;
    }
  }

  /**
   * 🎯 Create endpoint configuration from indexing config
   */
  private async createEndpointConfig(
    config: IndexingConfig, 
    job: any
  ): Promise<ApiEndpointConfig> {
    
    const path = `/api/${config.apiEndpoint}`;
    
    // Generate description
    const description = this.generateDescription(config);
    
    // Generate parameters
    const parameters = this.generateParameters(config);
    
    // Generate SQL query
    const sqlQuery = this.generateSqlQuery(config);
    
    // Determine cache time based on data type
    const cacheTime = this.determineCacheTime(config);

    return {
      path,
      method: 'GET',
      description,
      parameters,
      filters: config.filters || {},
      sqlQuery,
      cacheTime,
    };
  }

  /**
   * 📝 Generate human-readable description
   */
  private generateDescription(config: IndexingConfig): string {
    const { addresses, events, fromBlock, toBlock, originalQuery } = config;
    
    let desc = `API endpoint for ${events.join(', ')} events`;
    
    if (addresses.length > 0) {
      desc += ` for specific addresses`;
    }
    
    if (fromBlock) {
      desc += ` from block ${fromBlock}`;
    }
    
    if (toBlock) {
      desc += ` to block ${toBlock}`;
    }
    
    desc += `. Generated from query: "${originalQuery}"`;
    
    return desc;
  }

  /**
   * 🔧 Generate API parameters
   */
  private generateParameters(config: IndexingConfig): Record<string, any> {
    const params: Record<string, any> = {
      limit: {
        type: 'number',
        default: 100,
        max: 1000,
        description: 'Number of records to return'
      },
      offset: {
        type: 'number', 
        default: 0,
        description: 'Number of records to skip'
      },
      sortBy: {
        type: 'string',
        default: 'timestamp',
        options: ['timestamp', 'blockNumber', 'value'],
        description: 'Field to sort by'
      },
      sortOrder: {
        type: 'string',
        default: 'desc',
        options: ['asc', 'desc'],
        description: 'Sort order'
      }
    };

    // Add address-specific parameters
    if (config.addresses.length > 0) {
      params.address = {
        type: 'string',
        description: 'Filter by specific address (from or to)',
        example: config.addresses[0]
      };
    }

    // Add block range parameters
    if (config.fromBlock || config.toBlock) {
      params.fromBlock = {
        type: 'number',
        description: 'Starting block number',
        example: config.fromBlock
      };
      params.toBlock = {
        type: 'number', 
        description: 'Ending block number',
        example: config.toBlock
      };
    }

    // Add value filter parameters
    params.minValue = {
      type: 'string',
      description: 'Minimum transfer value (in token units)',
      example: '1000000'
    };
    
    params.maxValue = {
      type: 'string',
      description: 'Maximum transfer value (in token units)', 
      example: '10000000000'
    };

    return params;
  }

  /**
   * 🗄️ Generate SQL query for endpoint
   */
  private generateSqlQuery(config: IndexingConfig): string {
    let baseQuery = `
      SELECT 
        t.id,
        t."blockNumber",
        t."txHash",
        t."from",
        t."to", 
        t.value,
        t.timestamp,
        t."gasUsed",
        t."gasPrice",
        tk.symbol,
        tk."name" as "tokenName",
        tk.address as "tokenAddress"
      FROM "Transfer" t
      JOIN "Token" tk ON t."tokenId" = tk.id
      WHERE 1=1
    `;

    // Add address filters
    if (config.addresses.length > 0) {
      const addressList = config.addresses.map(addr => `'${addr.toLowerCase()}'`).join(',');
      baseQuery += ` AND tk.address IN (${addressList})`;
    }

    // Add block filters (always quote blockNumber)
    if (config.fromBlock) {
      baseQuery += ` AND CAST(t."blockNumber" AS INTEGER) >= ${config.fromBlock}`;
    }
    
    if (config.toBlock) {
      baseQuery += ` AND CAST(t."blockNumber" AS INTEGER) <= ${config.toBlock}`;
    }

    // Add dynamic filters placeholder
    baseQuery += `
      {{DYNAMIC_FILTERS}}
      ORDER BY {{SORT_BY}} {{SORT_ORDER}}
      LIMIT {{LIMIT}} OFFSET {{OFFSET}}
    `;

    return baseQuery.trim();
  }

  /**
   * ⏱️ Determine cache time based on data characteristics
   */
  private determineCacheTime(config: IndexingConfig): number {
    // Hot data (recent blocks) - cache for 30 seconds
    if (!config.toBlock || (config.toBlock && config.toBlock > Date.now() / 1000 - 3600)) {
      return 30;
    }
    
    // Warm data (few hours old) - cache for 5 minutes  
    if (config.toBlock && config.toBlock > Date.now() / 1000 - 86400) {
      return 300;
    }
    
    // Cold data (historical) - cache for 1 hour
    return 3600;
  }

  /**
   * 💾 Store API endpoint in database
   */
  private async storeApiEndpoint(
    endpointConfig: ApiEndpointConfig,
    originalConfig: IndexingConfig
  ): Promise<void> {
    await this.prisma.apiEndpoint.upsert({
      where: { path: endpointConfig.path },
      create: {
        path: endpointConfig.path,
        query: originalConfig.originalQuery,
        sqlQuery: endpointConfig.sqlQuery,
        parameters: endpointConfig.parameters,
        description: endpointConfig.description,
        cacheTime: endpointConfig.cacheTime,
      },
      update: {
        query: originalConfig.originalQuery,
        sqlQuery: endpointConfig.sqlQuery,
        parameters: endpointConfig.parameters,
        description: endpointConfig.description,
        cacheTime: endpointConfig.cacheTime,
        lastUsed: new Date(),
      },
    });
  }

  /**
   * 📊 Execute dynamic API endpoint
   */
  async executeDynamicApi(
    path: string,
    queryParams: Record<string, any> = {}
  ): Promise<DynamicApiResponse> {
    this.logger.log(`🔍 Executing dynamic API: ${path}`);

    try {
      // Get endpoint config from database
      const endpoint = await this.prisma.apiEndpoint.findUnique({
        where: { path },
      });

      if (!endpoint) {
        // Try to create default endpoints if the requested one doesn't exist
        if (path === '/api/transfers') {
          this.logger.log('🔄 Transfers endpoint not found, creating default...');
          await this.createDefaultTransfersEndpoint();
          
          // Try to get the endpoint again
          const newEndpoint = await this.prisma.apiEndpoint.findUnique({
            where: { path },
          });
          
          if (!newEndpoint) {
            throw new Error(`Failed to create endpoint ${path}`);
          }
        } else {
          throw new Error(`Endpoint ${path} not found`);
        }
      }

      // Build dynamic query
      const { query, countQuery } = this.buildDynamicQuery(endpoint.sqlQuery, queryParams);
      
      // Execute queries
      const [data, countResult] = await Promise.all([
        this.prisma.$queryRawUnsafe(query),
        this.prisma.$queryRawUnsafe(countQuery),
      ]);

      const total = countResult[0]?.count || 0;
      
      // Update usage statistics
      await this.updateEndpointUsage(path);

      return {
        success: true,
        data: data as any[],
        pagination: {
          limit: parseInt(queryParams.limit) || 100,
          offset: parseInt(queryParams.offset) || 0,
          total: parseInt(total),
        },
        metadata: {
          endpoint: path,
          generatedAt: new Date().toISOString(),
          query: endpoint.query,
        },
      };

    } catch (error) {
      this.logger.error(`❌ Failed to execute API ${path}:`, error);
      throw error;
    }
  }

  /**
   * 🔧 Build dynamic query with parameters
   */
  private buildDynamicQuery(
    baseSql: string,
    params: Record<string, any>
  ): { query: string; countQuery: string } {
    
    let dynamicFilters = '';
    
    // Add parameter-based filters
    if (params.address) {
      dynamicFilters += ` AND (t."from" ILIKE '%${params.address}%' OR t."to" ILIKE '%${params.address}%')`;
    }
    
    if (params.token) {
      dynamicFilters += ` AND tk.address ILIKE '%${params.token}%'`;
    }
    
    if (params.fromBlock) {
      dynamicFilters += ` AND CAST(t."blockNumber" AS INTEGER) >= ${parseInt(params.fromBlock)}`;
    }
    
    if (params.toBlock) {
      dynamicFilters += ` AND CAST(t."blockNumber" AS INTEGER) <= ${parseInt(params.toBlock)}`;
    }
    
    if (params.minValue) {
      dynamicFilters += ` AND CAST(t.value AS DECIMAL) >= ${parseFloat(params.minValue)}`;
    }
    
    if (params.maxValue) {
      dynamicFilters += ` AND CAST(t.value AS DECIMAL) <= ${parseFloat(params.maxValue)}`;
    }

    // Always quote blockNumber, gasUsed, gasPrice, txHash, and name in ORDER BY and SELECT
    const sortByColumn = this.getSortByColumn(params.sortBy || 'timestamp');

    let safeBaseSql = baseSql
      .replace(/t\.blockNumber/g, 't."blockNumber"')
      .replace(/t\.gasUsed/g, 't."gasUsed"')
      .replace(/t\.gasPrice/g, 't."gasPrice"')
      .replace(/t\.txHash/g, 't."txHash"')
      .replace(/tk\.name/g, 'tk."name"');

    const query = safeBaseSql
      .replace('{{DYNAMIC_FILTERS}}', dynamicFilters)
      .replace('{{SORT_BY}}', sortByColumn)
      .replace('{{SORT_ORDER}}', params.sortOrder || 'DESC')
      .replace('{{LIMIT}}', params.limit || '100')
      .replace('{{OFFSET}}', params.offset || '0');

    // Create count query
    const countQuery = `
      SELECT COUNT(*) as count
      FROM "Transfer" t
      JOIN "Token" tk ON t."tokenId" = tk.id
      WHERE 1=1 ${dynamicFilters}
    `;

    return { query, countQuery };
  }

  /**
   * 🔧 Get properly quoted sort column name
   */
  private getSortByColumn(sortBy: string): string {
    const columnMap: Record<string, string> = {
      'timestamp': 't.timestamp',
      'blockNumber': 't."blockNumber"',
      'value': 't.value',
      'from': 't."from"',
      'to': 't."to"',
      'txHash': 't."txHash"'
    };
    
    return columnMap[sortBy] || 't.timestamp';
  }

  /**
   * 📈 Update endpoint usage statistics
   */
  private async updateEndpointUsage(path: string): Promise<void> {
    await this.prisma.apiEndpoint.update({
      where: { path },
      data: {
        lastUsed: new Date(),
        // Note: useCount increment would need raw SQL in Prisma
      },
    });
  }

  /**
   * 📋 List all available dynamic endpoints
   */
  async listAvailableEndpoints(): Promise<any[]> {
    const endpoints = await this.prisma.apiEndpoint.findMany({
      orderBy: { lastUsed: 'desc' },
    });

    return endpoints.map(endpoint => ({
      path: endpoint.path,
      description: endpoint.description,
      originalQuery: endpoint.query,
      parameters: endpoint.parameters,
      cacheTime: endpoint.cacheTime,
      lastUsed: endpoint.lastUsed,
    }));
  }

  /**
   * 🔧 Create default transfers endpoint if none exists
   */
  async createDefaultTransfersEndpoint(): Promise<void> {
    this.logger.log('🔧 Creating default transfers endpoint...');

    try {
      // Check if transfers endpoint already exists
      const existingEndpoint = await this.prisma.apiEndpoint.findUnique({
        where: { path: '/api/transfers' },
      });

      if (existingEndpoint) {
        this.logger.log('✅ Transfers endpoint already exists');
        return;
      }

      // Create default transfers endpoint
      const defaultConfig = {
        path: '/api/transfers',
        query: 'Show me all token transfers',
        sqlQuery: `
          SELECT 
            t.id,
            t."blockNumber",
            t."txHash",
            t."from",
            t."to", 
            t.value,
            t.timestamp,
            t."gasUsed",
            t."gasPrice",
            tk.symbol,
            tk."name" as "tokenName",
            tk.address as "tokenAddress"
          FROM "Transfer" t
          JOIN "Token" tk ON t."tokenId" = tk.id
          WHERE 1=1
          {{DYNAMIC_FILTERS}}
          ORDER BY {{SORT_BY}} {{SORT_ORDER}}
          LIMIT {{LIMIT}} OFFSET {{OFFSET}}
        `,
        parameters: {
          token: 'string (optional) - Filter by token address',
          fromBlock: 'number (optional) - Start block number',
          toBlock: 'number (optional) - End block number',
          address: 'string (optional) - Filter by from/to address',
          minValue: 'string (optional) - Minimum transfer value',
          maxValue: 'string (optional) - Maximum transfer value',
          limit: 'number (optional) - Number of results (default: 100)',
          offset: 'number (optional) - Offset for pagination (default: 0)',
          sortBy: 'string (optional) - Sort field (default: timestamp)',
          sortOrder: 'string (optional) - Sort order: ASC/DESC (default: DESC)'
        },
        description: 'Get all token transfers with optional filtering',
        cacheTime: 300,
      };

      await this.prisma.apiEndpoint.create({
        data: defaultConfig,
      });

      this.logger.log('✅ Created default transfers endpoint: /api/transfers');

    } catch (error) {
      this.logger.error('❌ Failed to create default transfers endpoint:', error);
      throw error;
    }
  }

  /**
   * 🔧 Initialize default endpoints
   */
  async initializeDefaultEndpoints(): Promise<void> {
    this.logger.log('🚀 Initializing default API endpoints...');
    
    try {
      // Create default transfers endpoint
      await this.createDefaultTransfersEndpoint();
      
      // Generate API endpoints from any existing completed jobs
      const completedJobs = await this.prisma.indexingJob.findMany({
        where: { status: 'completed' },
      });
      
      for (const job of completedJobs) {
        try {
          this.logger.log(`🔧 Generating API endpoint for completed job ${job.id}`);
          await this.generateApiFromJob(job.id);
        } catch (error) {
          this.logger.error(`❌ Failed to generate API for job ${job.id}:`, error);
        }
      }
      
      this.logger.log('✅ Default endpoints initialized');
    } catch (error) {
      this.logger.error('❌ Failed to initialize default endpoints:', error);
    }
  }

  /**
   * 📄 Create a new API endpoint
   */
  /**
   * 📄 Create or update API endpoint (handles duplicates)
   */
  async createApiEndpoint(jobId: string, path: string, query: string, sqlQuery: string): Promise<void> {
    // Use UPSERT instead of CREATE to handle duplicates
    const endpoint = await this.prisma.apiEndpoint.upsert({
      where: { path },
      create: {
        path,
        query,
        sqlQuery,
        parameters: {},
        description: `Auto-generated endpoint for: ${query}`,
      },
      update: {
        query, // Update with latest query
        sqlQuery, // Update with latest SQL
        lastUsed: new Date(), // Mark as recently used
        description: `Auto-generated endpoint for: ${query}`,
      },
    });

    // 🚀 EMIT WEBSOCKET EVENT FOR NEW/UPDATED API
    this.indexerGateway.emitApiCreated({
      jobId: jobId,
      path: endpoint.path,
      query: endpoint.query,
      description: endpoint.description,
      timestamp: new Date(),
    });

    this.logger.log(`🔗 Created/updated API endpoint: ${path}`);
  }
}