const API_BASE_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3001';

export interface JobCreationResponse {
  success: boolean;
  jobId: string;
  config: any;
  message: string;
  timestamp: Date;
}

export interface JobStatus {
  success: boolean;
  job: {
    id: string;
    query: string;
    status: string;
    progress: number;
    createdAt: Date;
    updatedAt: Date;
    completedAt?: Date;
    config: any;
  };
  timestamp: Date;
}

export interface JobsListResponse {
  success: boolean;
  jobs: Array<{
    id: string;
    query: string;
    status: string;
    progress: number;
    createdAt: Date;
    updatedAt: Date;
    completedAt?: Date;
    config: any;
  }>;
  pagination: {
    limit: number;
    offset: number;
    total: number;
  };
  summary: {
    activeJobs: number;
    totalReturned: number;
  };
  timestamp: Date;
}

export interface HealthResponse {
  status: string;
  timestamp: Date;
  database: any;
  stats: any;
}

export interface IndexerStatsResponse {
  blockchain: {
    latestBlock: number;
    provider: string;
  };
  database: any;
  popularTokens: number;
  activeJobs: number;
}

export class EthIndexerAPI {
  /**
   * Create a new indexing job using AI query parsing
   */
  static async createJob(query: string): Promise<JobCreationResponse> {
    const response = await fetch(`${API_BASE_URL}/orchestrator/execute`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify({ query }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Failed to create job: ${response.status} ${errorText}`);
    }

    return response.json();
  }

  /**
   * Get all jobs with pagination
   */
  static async getJobs(limit = 20, offset = 0): Promise<JobsListResponse> {
    const response = await fetch(`${API_BASE_URL}/orchestrator/jobs?limit=${limit}&offset=${offset}`, {
      headers: { 'Accept': 'application/json' },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch jobs: ${response.status}`);
    }

    return response.json();
  }

  /**
   * Get specific job status by ID
   */
  static async getJobStatus(jobId: string): Promise<JobStatus> {
    const response = await fetch(`${API_BASE_URL}/orchestrator/job/${jobId}`, {
      headers: { 'Accept': 'application/json' },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch job status: ${response.status}`);
    }

    return response.json();
  }

  /**
   * Get orchestrator statistics
   */
  static async getOrchestratorStats() {
    const response = await fetch(`${API_BASE_URL}/orchestrator/stats`, {
      headers: { 'Accept': 'application/json' },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch orchestrator stats: ${response.status}`);
    }

    return response.json();
  }

  /**
   * Get backend health status
   */
  static async getHealth(): Promise<HealthResponse> {
    const response = await fetch(`${API_BASE_URL}/health`, {
      headers: { 'Accept': 'application/json' },
    });

    if (!response.ok) {
      throw new Error(`Health check failed: ${response.status}`);
    }

    return response.json();
  }

  /**
   * Get indexer statistics (blockchain sync, tokens, etc.)
   */
  static async getIndexerStats(): Promise<IndexerStatsResponse> {
    const response = await fetch(`${API_BASE_URL}/indexer/stats`, {
      headers: { 'Accept': 'application/json' },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch indexer stats: ${response.status}`);
    }

    return response.json();
  }

  /**
   * Get latest block number from blockchain
   */
  static async getLatestBlock() {
    const response = await fetch(`${API_BASE_URL}/indexer/latest-block`, {
      headers: { 'Accept': 'application/json' },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch latest block: ${response.status}`);
    }

    return response.json();
  }

  /**
   * Initialize popular tokens (for testing/setup)
   */
  static async initializePopularTokens() {
    const response = await fetch(`${API_BASE_URL}/indexer/initialize-popular-tokens`, {
      method: 'POST',
      headers: { 'Accept': 'application/json' },
    });

    if (!response.ok) {
      throw new Error(`Failed to initialize popular tokens: ${response.status}`);
    }

    return response.json();
  }

  /**
   * Trigger hot data indexing (recent blocks for popular tokens)
   */
  static async indexHotData() {
    const response = await fetch(`${API_BASE_URL}/indexer/index-hot-data`, {
      method: 'POST',
      headers: { 'Accept': 'application/json' },
    });

    if (!response.ok) {
      throw new Error(`Failed to start hot data indexing: ${response.status}`);
    }

    return response.json();
  }

  /**
   * Index a specific token manually
   */
  static async indexToken(tokenAddress: string, fromBlock?: number, toBlock?: number) {
    const response = await fetch(`${API_BASE_URL}/indexer/index-token`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify({ 
        tokenAddress, 
        fromBlock, 
        toBlock 
      }),
    });

    if (!response.ok) {
      throw new Error(`Failed to index token: ${response.status}`);
    }

    return response.json();
  }

  /**
   * Parse a natural language query using AI (without creating a job)
   */
  static async parseQuery(query: string) {
    const response = await fetch(`${API_BASE_URL}/ai/parse-query`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify({ query }),
    });

    if (!response.ok) {
      throw new Error(`Failed to parse query: ${response.status}`);
    }

    return response.json();
  }
}