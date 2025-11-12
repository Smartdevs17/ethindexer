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
   * Generate API endpoint from completed indexing job
   */
  async generateApiFromJob(jobId: string): Promise<ApiEndpointConfig | null> {
    this.logger.log(`Generating API endpoint for job ${jobId}`);

    try {
      // Get completed job
      const job = await this.prisma.indexingJob.findUnique({
        where: { id: jobId },
      });

      if (!job || job.status !== 'completed') {
        this.logger.warn(`Job ${jobId} not found or not completed`);
        return null;
      }

      const config = job.config as unknown as IndexingConfig;
      const endpointConfig = await this.createEndpointConfig(config, job);
      
      await this.storeApiEndpoint(endpointConfig, config, jobId);
      await this.createApiEndpoint(jobId, endpointConfig.path, config.originalQuery, endpointConfig.sqlQuery);
      this.logger.log(`Generated API endpoint: ${endpointConfig.path}`);
  return endpointConfig;

    } catch (error) {
      this.logger.error(`Failed to generate API for job ${jobId}:`, error);
      return null;
    }
  }

  /**
   * Create endpoint configuration from indexing config
   */
  private async createEndpointConfig(
    config: IndexingConfig, 
    job: any
  ): Promise<ApiEndpointConfig> {
    const uniquePath = this.generateUniqueApiPath(config, job);
    const description = this.generateDescription(config);
    const parameters = this.generateParameters(config);
    const sqlQuery = this.generateSqlQuery(config);
    const cacheTime = this.determineCacheTime(config);

    return {
      path: uniquePath,
      method: 'GET',
      description,
      parameters,
      filters: config.filters || {},
      sqlQuery,
      cacheTime,
    };
  }

  /**
   * Generate API endpoint path - use unique path per job to avoid conflicts
   * Since path must be unique in database, we use a unique path per job
   * But the API is accessed via /api/dynamic/transfers?job_id=xxx
   */
  private generateUniqueApiPath(config: IndexingConfig, job: any): string {
    const uniquePath = `/api/dynamic/transfers/job-${job.id}`;
    this.logger.log(`Generated unique API path for storage: ${uniquePath} for job ${job.id}`);
    return uniquePath;
  }

  /**
   * Generate human-readable description
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
   * Generate API parameters
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
   * Filter addresses based on the original query to match what was actually requested
   * If query mentions specific tokens, only include those addresses
   */
  private filterAddressesByQuery(originalQuery: string, addresses: string[]): string[] {
    if (!originalQuery || addresses.length === 0) {
      return addresses;
    }
    
    const queryLower = originalQuery.toLowerCase();
    const tokenMap: { [key: string]: string } = {
      'usdc': '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48',
      'usdt': '0xdac17f958d2ee523a2206206994597c13d831ec7',
      'weth': '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2',
      'dai': '0x6b175474e89094c44da98b954eedeac495271d0f',
    };
    
    const mentionedTokens: string[] = [];
    for (const [tokenName, address] of Object.entries(tokenMap)) {
      if (queryLower.includes(tokenName)) {
        mentionedTokens.push(address.toLowerCase());
      }
    }
    
    if (mentionedTokens.length > 0) {
      const filtered = addresses.filter(addr => 
        mentionedTokens.includes(addr.toLowerCase())
      );
      this.logger.log(`Query mentions tokens: ${mentionedTokens.join(', ')}, filtered addresses: ${filtered.length}`);
      return filtered.length > 0 ? filtered : addresses;
    }
    
    return addresses;
  }

  /**
   * Generate SQL query for endpoint
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

    if (config.addresses && config.addresses.length > 0) {
      const normalizedAddresses = config.addresses.map(addr => addr.toLowerCase());
      const addressList = normalizedAddresses.map(addr => `'${addr}'`).join(',');
      baseQuery += ` AND LOWER(tk.address) IN (${addressList})`;
      this.logger.log(`SQL Query will filter by token addresses: ${normalizedAddresses.join(', ')}`);
    } else {
      this.logger.warn(`No addresses in config - SQL query will return all transfers`);
    }

    if (config.fromBlock) {
      baseQuery += ` AND CAST(t."blockNumber" AS INTEGER) >= ${config.fromBlock}`;
      this.logger.log(`SQL Query will filter from block: ${config.fromBlock}`);
    }
    
    if (config.toBlock) {
      baseQuery += ` AND CAST(t."blockNumber" AS INTEGER) <= ${config.toBlock}`;
      this.logger.log(`SQL Query will filter to block: ${config.toBlock}`);
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
   * Determine cache time based on data characteristics
   */
  private determineCacheTime(config: IndexingConfig): number {
    if (!config.toBlock || (config.toBlock && config.toBlock > Date.now() / 1000 - 3600)) {
      return 30;
    }
    
    if (config.toBlock && config.toBlock > Date.now() / 1000 - 86400) {
      return 300;
    }
    
    return 3600;
  }

  /**
   * Store API endpoint in database
   */
  private async storeApiEndpoint(
    endpointConfig: ApiEndpointConfig,
    originalConfig: IndexingConfig,
    jobId: string
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
        jobId: jobId,
      },
      update: {
        query: originalConfig.originalQuery,
        sqlQuery: endpointConfig.sqlQuery,
        parameters: endpointConfig.parameters,
        description: endpointConfig.description,
        cacheTime: endpointConfig.cacheTime,
        lastUsed: new Date(),
        jobId: jobId,
      },
    });
  }

  /**
   * Execute dynamic API endpoint
   */
  async executeDynamicApi(
    path: string,
    queryParams: Record<string, any> = {}
  ): Promise<DynamicApiResponse> {
    this.logger.log(`Executing dynamic API: ${path}`);

    try {
      let endpointToUse = null;
      
      if (path === '/api/dynamic/transfers' && queryParams.job_id) {
        const jobId = queryParams.job_id;
        this.logger.log(`Looking up endpoint by job_id: ${jobId}`);
        
        const endpointByJobId = await this.prisma.apiEndpoint.findFirst({
          where: { jobId },
        });
        
        if (endpointByJobId) {
          this.logger.log(`Found endpoint by job_id: ${endpointByJobId.path} (job: ${jobId})`);
          
          const job = await this.prisma.indexingJob.findUnique({
            where: { id: jobId },
          });
          
          if (job) {
            const jobConfig = job.config as unknown as IndexingConfig;
            this.logger.log(`Job config addresses: ${JSON.stringify(jobConfig.addresses || [])}`);
            this.logger.log(`Job addresses field: ${JSON.stringify(job.addresses || [])}`);
            this.logger.log(`Job config fromBlock: ${jobConfig.fromBlock}, toBlock: ${jobConfig.toBlock}`);
            this.logger.log(`Original query: ${job.query}`);
            
            const filteredAddresses = this.filterAddressesByQuery(job.query, jobConfig.addresses || job.addresses || []);
            this.logger.log(`Filtered addresses based on query: ${JSON.stringify(filteredAddresses)}`);
            
            const filteredConfig: IndexingConfig = {
              ...jobConfig,
              addresses: filteredAddresses,
            };
            
            const regeneratedSql = this.generateSqlQuery(filteredConfig);
            
            if (endpointByJobId.sqlQuery !== regeneratedSql) {
              this.logger.log(`SQL query differs from job config - updating endpoint with correct query`);
              endpointByJobId.sqlQuery = regeneratedSql;
              await this.prisma.apiEndpoint.update({
                where: { id: endpointByJobId.id },
                data: { sqlQuery: regeneratedSql },
              });
              this.logger.log(`Updated endpoint SQL query to match filtered job config`);
            } else {
              this.logger.log(`Endpoint SQL query matches filtered job config`);
            }
          }
          
          endpointToUse = endpointByJobId;
        } else {
          this.logger.warn(`No endpoint found for job_id: ${jobId} - will use default transfers endpoint`);
        }
      }
      
      if (!endpointToUse) {
        if (path === '/api/dynamic/transfers' && !queryParams.job_id) {
          this.logger.log('No job_id provided - looking for default transfers endpoint (jobId: null)');
          
          endpointToUse = await this.prisma.apiEndpoint.findFirst({
            where: { 
              path: '/api/dynamic/transfers',
              jobId: null
            },
          });
          
          if (!endpointToUse) {
            this.logger.log('Default endpoint not found, creating...');
            await this.createDefaultTransfersEndpoint();
            
            endpointToUse = await this.prisma.apiEndpoint.findFirst({
              where: { 
                path: '/api/dynamic/transfers',
                jobId: null
              },
            });
            
            if (!endpointToUse) {
              throw new Error(`Failed to create default endpoint ${path}`);
            }
          }
          
          this.logger.log('Using default transfers endpoint (all transfers, no filtering)');
        } else {
          endpointToUse = await this.prisma.apiEndpoint.findUnique({
        where: { path },
      });
        }
      }
      
      if (!endpointToUse) {
        if (path === '/api/dynamic/transfers') {
          this.logger.log('Transfers endpoint not found, creating default...');
          await this.createDefaultTransfersEndpoint();
          
          const newEndpoint = await this.prisma.apiEndpoint.findUnique({
            where: { path },
          });
          
          if (!newEndpoint) {
            throw new Error(`Failed to create endpoint ${path}`);
          }
          
          endpointToUse = newEndpoint;
        } else {
          throw new Error(`Endpoint ${path} not found`);
        }
      }

      if (!endpointToUse || !endpointToUse.sqlQuery) {
        this.logger.error(`Endpoint ${path} configuration error:`, {
          endpointExists: !!endpointToUse,
          hasSqlQuery: !!endpointToUse?.sqlQuery,
          endpointData: endpointToUse
        });
        throw new Error(`Endpoint ${path} is missing required configuration (sqlQuery)`);
      }

      this.logger.log(`Using endpoint configuration:`, {
        path: endpointToUse.path,
        jobId: endpointToUse.jobId,
        hasSqlQuery: !!endpointToUse.sqlQuery,
        hasParameters: !!endpointToUse.parameters,
        originalQuery: endpointToUse.query
      });

      if (endpointToUse.sqlQuery) {
        this.logger.debug(`SQL Query (first 200 chars): ${endpointToUse.sqlQuery.substring(0, 200)}...`);
      }

      const { query, countQuery } = this.buildDynamicQuery(endpointToUse.sqlQuery, queryParams);
      
      this.logger.debug(`Final SQL Query: ${query.substring(0, 300)}...`);
      
      // Execute queries
      const [data, countResult] = await Promise.all([
        this.prisma.$queryRawUnsafe(query),
        this.prisma.$queryRawUnsafe(countQuery),
      ]);

      const total = countResult[0]?.count || 0;
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
          query: endpointToUse.query,
        },
      };

    } catch (error) {
      this.logger.error(`Failed to execute API ${path}:`, error);
      throw error;
    }
  }

  /**
   * Build dynamic query with parameters
   */
  private buildDynamicQuery(
    baseSql: string,
    params: Record<string, any>
  ): { query: string; countQuery: string } {
    
    let dynamicFilters = '';
    
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

    const countQuery = `
      SELECT COUNT(*) as count
      FROM "Transfer" t
      JOIN "Token" tk ON t."tokenId" = tk.id
      WHERE 1=1 ${dynamicFilters}
    `;

    return { query, countQuery };
  }

  /**
   * Get properly quoted sort column name
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
   * Update endpoint usage statistics
   */
  private async updateEndpointUsage(path: string): Promise<void> {
    await this.prisma.apiEndpoint.update({
      where: { path },
      data: {
        lastUsed: new Date(),
      },
    });
  }

  /**
   * List all available dynamic endpoints
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
   * Create default transfers endpoint if none exists (jobId: null)
   */
  async createDefaultTransfersEndpoint(): Promise<void> {
    this.logger.log('Creating default transfers endpoint (jobId: null)...');

    try {
      const existingEndpoint = await this.prisma.apiEndpoint.findFirst({
        where: { 
          path: '/api/dynamic/transfers',
          jobId: null
        },
      });

      if (existingEndpoint) {
        this.logger.log('Default transfers endpoint already exists (jobId: null)');
        return;
      }

      const defaultConfig = {
        path: '/api/dynamic/transfers',
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

      await this.prisma.apiEndpoint.upsert({
        where: { path: '/api/dynamic/transfers' },
        create: {
          ...defaultConfig,
          jobId: null,
        },
        update: {
          jobId: null,
          sqlQuery: defaultConfig.sqlQuery,
          query: defaultConfig.query,
          description: defaultConfig.description,
          parameters: defaultConfig.parameters,
        },
      });

      this.logger.log('Created/updated default transfers endpoint: /api/dynamic/transfers (jobId: null)');

    } catch (error) {
      this.logger.error('Failed to create default transfers endpoint:', error);
      throw error;
    }
  }

  /**
   * Initialize default endpoints
   */
  async initializeDefaultEndpoints(): Promise<void> {
    this.logger.log('Initializing default API endpoints...');
    
    try {
      await this.createDefaultTransfersEndpoint();
      
      const completedJobs = await this.prisma.indexingJob.findMany({
        where: { status: 'completed' },
      });
      
      for (const job of completedJobs) {
        try {
          this.logger.log(`Generating API endpoint for completed job ${job.id}`);
          await this.generateApiFromJob(job.id);
        } catch (error) {
          this.logger.error(`Failed to generate API for job ${job.id}:`, error);
        }
      }
      
      this.logger.log('Default endpoints initialized');
    } catch (error) {
      this.logger.error('Failed to initialize default endpoints:', error);
    }
  }

  /**
   * Create or update API endpoint (handles duplicates)
   */
  async createApiEndpoint(jobId: string, path: string, query: string, sqlQuery: string): Promise<void> {
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
        query,
        sqlQuery,
        lastUsed: new Date(),
        description: `Auto-generated endpoint for: ${query}`,
      },
    });

    this.indexerGateway.emitApiCreated({
      jobId: jobId,
      path: endpoint.path,
      query: endpoint.query,
      description: endpoint.description,
      timestamp: new Date(),
    });

    this.logger.log(`Created/updated API endpoint: ${path}`);
  }
}