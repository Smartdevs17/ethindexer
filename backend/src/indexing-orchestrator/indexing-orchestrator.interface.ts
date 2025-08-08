import { IndexingConfig } from "src/ai/ai.service";

export interface IndexingJobResult {
  jobId: string;
  status: 'pending' | 'active' | 'completed' | 'error' | 'paused';
  message: string;
  config: IndexingConfig;
  progress: number;
  processedRecords: number;
  estimatedBlocks?: number;
  
  timestamp: Date;      // Primary timestamp for UI display
  createdAt: Date;      // Job creation time
  updatedAt: Date;      // Last update time
  completedAt?: Date;   // Completion time (optional)
}

export interface IndexingOrchestratorInterface {
  executeNaturalLanguageQuery(query: string): Promise<IndexingJobResult>;
  resolveTokenAddresses(config: IndexingConfig): Promise<IndexingConfig>;
  createIndexingJob(config: IndexingConfig): Promise<IndexingJobResult>;
  executeIndexingJob(jobId: string): Promise<void>;
}
