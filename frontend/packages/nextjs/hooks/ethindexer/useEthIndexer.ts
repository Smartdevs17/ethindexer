// Fixed useEthIndexer.ts with proper timestamp handling
import { useState, useEffect } from 'react';
import io, { Socket } from 'socket.io-client';

interface Job {
  jobId: string;
  message: string;
  progress: number;
  status: string;
  timestamp: Date;
  apiUrl?: string;
  apiDescription?: string;
  apiStatus?: 'preparing' | 'ready'; // Add status for API preparation
}

interface Transfer {
  id: string;
  value: string;
  token: { 
    address: string; 
    symbol?: string; 
    name?: string; 
  };
  from: string;
  to: string;
  blockNumber: string;
  timestamp: Date;
  txHash: string;
}

interface SystemStatus {
  message: string;
  stage: string;
  jobId?: string;
  timestamp: Date;
}

interface ChatResponse {
  message: string;
  isQueryReady: boolean;
  suggestedQuery?: string;
  needsMoreInfo?: string[];
  confidence: number;
}

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

// Helper function to safely convert timestamps
const safeTimestampToDate = (timestamp: any, fallback?: Date): Date => {
  if (!timestamp) {
    console.warn('⚠️ No timestamp provided, using fallback:', fallback || new Date());
    return fallback || new Date();
  }
  
  try {
    let date: Date;
    
    if (timestamp instanceof Date) {
      date = timestamp;
    } else if (typeof timestamp === 'string') {
      date = new Date(timestamp);
    } else if (typeof timestamp === 'number') {
      date = new Date(timestamp);
    } else {
      console.warn('⚠️ Invalid timestamp type:', typeof timestamp, timestamp);
      return fallback || new Date();
    }
    
    if (isNaN(date.getTime())) {
      console.warn('⚠️ Invalid date created from timestamp:', timestamp);
      return fallback || new Date();
    }
    
    return date;
  } catch (error) {
    console.error('❌ Error converting timestamp:', error, timestamp);
    return fallback || new Date();
  }
};

export const useEthIndexer = () => {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [transfers, setTransfers] = useState<Transfer[]>([]);
  const [systemStatus, setSystemStatus] = useState('');
  const [connectedClients, setConnectedClients] = useState(0);
  const [debugInfo, setDebugInfo] = useState<string[]>([]);

  const apiUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3001';

  // Helper function to add debug messages
  const addDebugInfo = (message: string) => {
    const timestamp = new Date().toLocaleTimeString();
    setDebugInfo(prev => [`${timestamp}: ${message}`, ...prev.slice(0, 19)]);
  };

  // WebSocket setup
  useEffect(() => {
    const wsUrl = `${process.env.NEXT_PUBLIC_WEBSOCKET_URL || 'http://localhost:3001'}/indexer`;
    const newSocket = io(wsUrl);
    setSocket(newSocket);

    // Connection events
    newSocket.on('connect', () => {
      console.log('🔌 Connected to EthIndexer WebSocket');
      setIsConnected(true);
      addDebugInfo('WebSocket connected successfully');
    });

    newSocket.on('disconnect', () => {
      console.log('🔌 Disconnected from EthIndexer WebSocket');
      setIsConnected(false);
      addDebugInfo('WebSocket disconnected');
    });

    // System status updates
    newSocket.on('system-status', (data: any) => {
      console.log('🚀 System Status:', data);
      setSystemStatus(`${data.message} (${data.stage})`);
      addDebugInfo(`System: ${data.message}`);
    });

    // API created event handling
    newSocket.on('api-created', (data: any) => {
      console.log('🔗 API Created:', data);
      addDebugInfo(`New API created: ${data.path}`);
      
      // Update job with API URL when it's generated
      if (data.jobId) {
        console.log(`🔗 Linking API ${data.path} to job ${data.jobId}`);
        
        setJobs(prev => prev.map(job => {
          if (job.jobId === data.jobId) {
            // Create full backend URL for the API endpoint
            const fullApiUrl = `${apiUrl}${data.path}`;
            console.log(`✅ Updated job ${data.jobId} with API URL: ${fullApiUrl}`);
            
            // Determine if the job is still active or completed
            const isJobActive = job.status === 'active' || job.progress < 100;
            const apiStatus = isJobActive ? 'preparing' : 'ready';
            
            return { 
              ...job, 
              apiUrl: fullApiUrl,
              apiDescription: data.description,
              apiStatus: apiStatus, // Add status to indicate if API is ready or preparing
              // Don't mark as completed here - let the job progress handle that
            };
          }
          return job;
        }));
        
        addDebugInfo(`✅ Job ${data.jobId} → API: ${data.path} (preparing)`);
      }
    });

    // Job progress updates with timestamp debugging
    newSocket.on('job-progress-global', (data: any) => {
      console.log('📊 Job Progress (Global):', data);
      console.log('🕐 Raw timestamp from WebSocket:', data.timestamp, typeof data.timestamp);
      
      addDebugInfo(`Job Progress: ${data.jobId?.slice(0, 8)}... - ${data.progress}%`);
      
      if (data.jobId && data.progress !== undefined) {
        setJobs(prev => prev.map(job => 
          job.jobId === data.jobId 
            ? { 
                ...job, 
                ...data,
                timestamp: safeTimestampToDate(data.timestamp, job.timestamp),
                // Update API status to ready when job completes
                apiStatus: data.status === 'completed' ? 'ready' : (job.apiStatus || 'preparing')
              }
            : job
        ));
      }
    });

    // Transfer updates with timestamp debugging
    newSocket.on('new-transfer', (data: any) => {
      console.log('💸 New Transfer:', data);
      console.log('🕐 Transfer timestamp:', data.timestamp, typeof data.timestamp);
      
      setTransfers(prev => [{
        ...data,
        timestamp: safeTimestampToDate(data.timestamp)
      }, ...prev.slice(0, 49)]);
      
      addDebugInfo(`New transfer: ${data.value} ${data.token?.symbol || 'tokens'}`);
    });

    // Connection stats
    newSocket.on('connection-stats', (data: any) => {
      setConnectedClients(data.connectedClients || 0);
    });

    // Debug: Log all WebSocket events
    newSocket.onAny((eventName, ...args) => {
      if (eventName !== 'system-status') {
        console.log(`📡 WebSocket [${eventName}]:`, args[0]);
      }
    });

    return () => {
      newSocket.disconnect();
    };
  }, []);

  // FIXED: Create job function with proper timestamp handling
  const createJob = async (query: string) => {
    try {
      addDebugInfo(`🚀 Creating job: ${query.slice(0, 50)}...`);
      
      const response = await fetch(`${apiUrl}/orchestrator/execute`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query }),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();
      console.log('✅ Job creation response:', result);
      
      if (result.success) {
        addDebugInfo(`✅ Job created: ${result.jobId || 'Unknown ID'}`);
        
        // Add job immediately to state with current timestamp
        const newJob: Job = {
          jobId: result.jobId || `temp-${Date.now()}`,
          message: `Created: ${query.slice(0, 60)}...`,
          progress: 0,
          status: 'active',
          timestamp: new Date(), // Use current time for immediate display
        };
        
        setJobs(prev => [newJob, ...prev]);
        
        // Refresh jobs from API after a delay to get server timestamp
        setTimeout(() => {
          fetchJobs();
          addDebugInfo('🔄 Refreshed jobs after creation');
        }, 1000);
        
        return result;
      } else {
        throw new Error(result.error || 'Job creation failed');
      }
    } catch (error) {
      addDebugInfo(`❌ Job creation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      throw error;
    }
  };

  // FIXED: Fetch jobs with proper timestamp conversion
  const fetchJobs = async () => {
    try {
      console.log('📡 Fetching jobs from API...');
      const response = await fetch(`${apiUrl}/orchestrator/jobs`);
      
      if (response.ok) {
        const data = await response.json();
        console.log('📥 Raw jobs data from API:', data);
        
        // Convert jobs with proper timestamp handling and generate API URLs
        const jobsWithTimestamps = (data.jobs || []).map((job: any) => {
          console.log(`🕐 Converting job ${job.jobId} timestamp:`, {
            original: job.timestamp,
            type: typeof job.timestamp,
            createdAt: job.createdAt,
            updatedAt: job.updatedAt
          });
          
          // Generate API URL for existing jobs
          let generatedApiUrl = undefined;
          let apiStatus: 'preparing' | 'ready' = 'preparing';
          
          if (job.status === 'completed' && job.config) {
            // For completed jobs, generate the API URL
            if (job.config.apiEndpoint) {
              generatedApiUrl = `${apiUrl}/api/${job.config.apiEndpoint}`;
              apiStatus = 'ready';
            } else if (job.config.addresses && job.config.addresses.length > 0) {
              // Generate URL based on token address
              const address = job.config.addresses[0];
              generatedApiUrl = `${apiUrl}/api/transfers?token=${address}`;
              apiStatus = 'ready';
            } else {
              // Default transfers endpoint
              generatedApiUrl = `${apiUrl}/api/transfers`;
              apiStatus = 'ready';
            }
          } else if (job.status === 'active') {
            // For active jobs, generate a preview API URL
            if (job.config?.apiEndpoint) {
              generatedApiUrl = `${apiUrl}/api/${job.config.apiEndpoint}`;
              apiStatus = 'preparing';
            } else if (job.config?.addresses && job.config.addresses.length > 0) {
              const address = job.config.addresses[0];
              generatedApiUrl = `${apiUrl}/api/transfers?token=${address}`;
              apiStatus = 'preparing';
            } else {
              generatedApiUrl = `${apiUrl}/api/transfers`;
              apiStatus = 'preparing';
            }
          }
          
          return {
            ...job,
            // Try multiple timestamp fields and convert safely
            timestamp: safeTimestampToDate(
              job.timestamp || job.updatedAt || job.createdAt
            ),
            // Also convert other date fields if they exist
            createdAt: job.createdAt ? safeTimestampToDate(job.createdAt) : undefined,
            updatedAt: job.updatedAt ? safeTimestampToDate(job.updatedAt) : undefined,
            completedAt: job.completedAt ? safeTimestampToDate(job.completedAt) : undefined,
            // Add generated API URL and status
            apiUrl: generatedApiUrl,
            apiStatus: apiStatus,
            apiDescription: job.config?.originalQuery || job.message,
          };
        });
        
        console.log('✅ Jobs with converted timestamps and API URLs:', jobsWithTimestamps);
        setJobs(jobsWithTimestamps);
        addDebugInfo(`Fetched ${jobsWithTimestamps.length} jobs with timestamps and API URLs`);
      } else {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
    } catch (error) {
      console.error('❌ Failed to fetch jobs:', error);
      addDebugInfo(`Job fetch failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  // Send chat message
  const sendChatMessage = async (message: string, conversationHistory: ChatMessage[] = []) => {
    try {
      const response = await fetch(`${apiUrl}/chat/message`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message, conversationHistory }),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();
      
      if (!result.success) {
        throw new Error(result.error || 'Chat request failed');
      }

      addDebugInfo(`Chat: ${result.response.isQueryReady ? 'Ready' : 'Needs more info'}`);
      
      return result.response;
    } catch (error) {
      addDebugInfo(`Chat failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      throw error;
    }
  };

  // Get chat suggestions
  const getChatSuggestions = async (context?: string): Promise<string[]> => {
    try {
      const response = await fetch(`${apiUrl}/chat/suggestions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ context }),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();
      return result.suggestions || [];
    } catch (error) {
      addDebugInfo(`Suggestions failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      return [];
    }
  };

  // Get system stats
  const getStats = async () => {
    try {
      const response = await fetch(`${apiUrl}/orchestrator/stats`);
      if (response.ok) {
        const data = await response.json();
        addDebugInfo(`Stats: ${data.stats?.activeJobs || 0} active jobs`);
        return data.stats;
      }
    } catch (error) {
      addDebugInfo(`Stats fetch failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  // Force refresh jobs (for manual debugging)
  const forceRefreshJobs = async () => {
    console.log('🔄 Force refreshing jobs...');
    await fetchJobs();
    addDebugInfo('🔄 Manual job refresh completed');
  };

  // Fetch existing transfers from API
  const fetchTransfers = async () => {
    try {
      console.log('📡 Fetching transfers from API...');
      const response = await fetch(`${apiUrl}/api/transfers?limit=50&sortBy=timestamp&sortOrder=DESC`);
      
      if (response.ok) {
        const data = await response.json();
        console.log('📥 Raw transfers data from API:', data);
        
        if (data.success && data.data) {
          // Convert API data to Transfer format
          const apiTransfers = data.data.map((transfer: any) => ({
            id: transfer.id,
            value: transfer.value,
            token: {
              address: transfer.tokenAddress,
              symbol: transfer.symbol,
              name: transfer.tokenName,
            },
            from: transfer.from,
            to: transfer.to,
            blockNumber: transfer.blockNumber,
            timestamp: new Date(transfer.timestamp),
            txHash: transfer.txHash,
          }));
          
          console.log('✅ Transfers with converted format:', apiTransfers);
          setTransfers(apiTransfers);
          addDebugInfo(`Fetched ${apiTransfers.length} transfers from API`);
        } else {
          console.log('⚠️ No transfers data in response:', data);
          addDebugInfo('No transfers data in API response');
        }
      } else {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
    } catch (error) {
      console.error('❌ Failed to fetch transfers:', error);
      addDebugInfo(`Transfer fetch failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  // Load initial data
  useEffect(() => {
    fetchJobs();
    fetchTransfers(); // Add this to load existing transfers
    getStats();
  }, []);

  return {
    // WebSocket connection
    isConnected,
    socket,
    
    // Data
    jobs,
    transfers,
    systemStatus,
    connectedClients,
    debugInfo,
    
    // Job management
    createJob,
    fetchJobs,
    forceRefreshJobs, // Add this for debugging
    fetchTransfers, // Add this to the return object
    getStats,
    
    // Chat functionality
    sendChatMessage,
    getChatSuggestions,
    
    // Utilities
    addDebugInfo,
  };
};