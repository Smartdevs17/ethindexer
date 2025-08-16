// Fixed useEthIndexer.ts with proper timestamp handling
import { useState, useEffect, useCallback } from 'react';
import io, { Socket } from 'socket.io-client';
import { useAccount } from 'wagmi';

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

interface User {
  id: string;
  address: string;
  ensName?: string;
  createdAt: Date;
  addresses: UserAddress[];
  stats?: UserStats;
}

interface UserAddress {
  id: string;
  name: string;
  address: string;
  createdAt: Date;
}

interface UserStats {
  totalJobs: number;
  completedJobs: number;
  activeJobs: number;
  savedAddresses: number;
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
  const [user, setUser] = useState<User | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  const { address, isConnected: isWalletConnected } = useAccount();
  const apiUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3001';

  // Helper function to add debug messages
  const addDebugInfo = (message: string) => {
    const timestamp = new Date().toLocaleTimeString();
    setDebugInfo(prev => [`${timestamp}: ${message}`, ...prev.slice(0, 19)]);
  };

  // Authenticate user when wallet connects
  const authenticateUser = useCallback(async (walletAddress: string) => {
    try {
      console.log('🔐 Authenticating user:', walletAddress);
      addDebugInfo(`Authenticating user: ${walletAddress.slice(0, 8)}...`);
      
      const response = await fetch(`${apiUrl}/users/auth`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ address: walletAddress })
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setUser(data.user);
          setIsAuthenticated(true);
          addDebugInfo(`✅ User authenticated: ${data.user.address.slice(0, 8)}...`);
          return data.user;
        }
      }
      
      throw new Error('Authentication failed');
    } catch (error) {
      console.error('❌ Authentication failed:', error);
      addDebugInfo(`❌ Authentication failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      
      // Retry authentication after 3 seconds for network issues
      if (error instanceof Error && error.message.includes('fetch')) {
        addDebugInfo('🔄 Retrying authentication in 3 seconds...');
        setTimeout(() => {
          if (isWalletConnected && address) {
            authenticateUser(address);
          }
        }, 3000);
      }
      
      return null;
    }
  }, [apiUrl, isWalletConnected, address]);

  // Authenticate when wallet connects with retry logic
  useEffect(() => {
    if (isWalletConnected && address && !isAuthenticated) {
      authenticateUser(address);
    } else if (!isWalletConnected) {
      setUser(null);
      setIsAuthenticated(false);
    }
  }, [isWalletConnected, address, isAuthenticated, authenticateUser]);

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

  // FIXED: Create job function with proper timestamp handling and user support
  const createJob = async (query: string) => {
    try {
      addDebugInfo(`🚀 Creating job: ${query.slice(0, 50)}...`);
      
      const requestBody: any = { query };
      
      // Add user address if authenticated
      if (isAuthenticated && user) {
        requestBody.userAddress = user.address;
        addDebugInfo(`👤 Creating job for user: ${user.address.slice(0, 8)}...`);
      }
      
      const response = await fetch(`${apiUrl}/orchestrator/execute`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();
      console.log('✅ Job creation response:', result);
      
      if (result.success) {
        // Check if this was served from cache
        if (result.result?.cacheInfo) {
          addDebugInfo(`✅ Data served from cache: ${result.result.cacheInfo.transferCount} transfers available`);
          
          // Create a "cache job" entry to show in the UI
          const cacheJob: Job = {
            jobId: `cache-${Date.now()}`,
            message: `Served from cache: ${query.slice(0, 60)}... (${result.result.cacheInfo.transferCount} transfers)`,
            progress: 100,
            status: 'completed',
            timestamp: new Date(),
            apiUrl: result.result.apiUrl,
            apiStatus: 'ready'
          };
          
          setJobs(prev => [cacheJob, ...prev]);
          
          return result;
        } else {
          addDebugInfo(`✅ Job created: ${result.result?.jobId || 'Unknown ID'}`);
          
          // Add job immediately to state with current timestamp
          const newJob: Job = {
            jobId: result.result?.jobId || `temp-${Date.now()}`,
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
        }
      } else {
        throw new Error(result.error || 'Job creation failed');
      }
    } catch (error) {
      addDebugInfo(`❌ Job creation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      throw error;
    }
  };

  // FIXED: Fetch jobs with proper timestamp conversion and pagination
  const fetchJobs = useCallback(async (limit = 50, offset = 0) => {
    try {
      console.log(`📡 Fetching jobs from API (limit: ${limit}, offset: ${offset})...`);
      const response = await fetch(`${apiUrl}/orchestrator/jobs?limit=${limit}&offset=${offset}`);
      
      if (response.ok) {
        const data = await response.json();
        console.log('📥 Raw jobs data from API:', data);
        
        // Convert jobs with proper timestamp handling and generate API URLs
        const jobsWithTimestamps = (data.jobs || []).map((job: any) => {
          console.log(`🕐 Converting job ${job.id} timestamp:`, {
            original: job.timestamp,
            type: typeof job.timestamp,
            createdAt: job.createdAt,
            updatedAt: job.updatedAt
          });
          
          // Convert timestamp to Date object
          const timestamp = safeTimestampToDate(job.timestamp, new Date());
          
          // Generate API URL based on job message
          let apiUrl: string | undefined;
          let apiDescription: string | undefined;
          let apiStatus: 'preparing' | 'ready' = 'preparing';
          
          if (job.status === 'completed' && job.message) {
            const message = job.message.toLowerCase();
            if (message.includes('usdc')) {
              apiUrl = '/api/usdc-transfers';
              apiDescription = 'USDC transfer data';
              apiStatus = 'ready';
            } else if (message.includes('weth')) {
              apiUrl = '/api/weth-transfers';
              apiDescription = 'WETH transfer data';
              apiStatus = 'ready';
            } else if (message.includes('dai')) {
              apiUrl = '/api/dai-transfers';
              apiDescription = 'DAI transfer data';
              apiStatus = 'ready';
            } else if (message.includes('usdt')) {
              apiUrl = '/api/usdt-transfers';
              apiDescription = 'USDT transfer data';
              apiStatus = 'ready';
            } else {
              // Generic API endpoint
              apiUrl = '/api/transfers';
              apiDescription = 'General transfer data';
              apiStatus = 'ready';
            }
          }
          
          return {
            jobId: job.id,
            message: job.message || 'Unknown job',
            progress: job.progress || 0,
            status: job.status || 'unknown',
            timestamp,
            apiUrl,
            apiDescription,
            apiStatus,
          };
        });
        
        console.log('✅ Jobs with converted timestamps and API URLs:', jobsWithTimestamps);
        
        if (offset === 0) {
          // First page - replace all jobs
          setJobs(jobsWithTimestamps);
        } else {
          // Subsequent pages - append to existing jobs
          setJobs(prev => [...prev, ...jobsWithTimestamps]);
        }
        
        addDebugInfo(`Fetched ${jobsWithTimestamps.length} jobs from API`);
      } else {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
    } catch (error) {
      console.error('❌ Failed to fetch jobs:', error);
      addDebugInfo(`Jobs fetch failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }, [apiUrl]);

  // Get system stats
  const getStats = useCallback(async () => {
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
  }, [apiUrl]);

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

  // Fetch live data statistics
  const fetchLiveDataStats = useCallback(async () => {
    try {
      console.log('📊 Fetching live data statistics...');
      const response = await fetch(`${apiUrl}/live-data/stats`);
      
      if (response.ok) {
        const data = await response.json();
        console.log('📥 Live data stats:', data);
        
        if (data.success && data.stats) {
          // Update transfers with recent activity
          if (data.recentActivity && data.recentActivity.length > 0) {
            const recentTransfers = data.recentActivity.map((transfer: any) => ({
              id: transfer.id,
              value: transfer.value,
              token: {
                address: transfer.token.address,
                symbol: transfer.token.symbol,
                name: transfer.token.name,
              },
              from: transfer.from,
              to: transfer.to,
              blockNumber: transfer.blockNumber,
              timestamp: new Date(transfer.timestamp),
              txHash: transfer.txHash,
            }));
            
            setTransfers(recentTransfers);
            addDebugInfo(`Updated with ${recentTransfers.length} recent transfers`);
          }
          
          addDebugInfo(`Live stats: ${data.stats.totalTransfers} transfers, ${data.stats.activeAPIs} APIs`);
          return data.stats;
        }
      } else {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
    } catch (error) {
      console.error('❌ Failed to fetch live data stats:', error);
      addDebugInfo(`Live data fetch failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }, [apiUrl]); // Add apiUrl to dependency array

  // User management functions
  const addUserAddress = async (name: string, address: string) => {
    if (!isAuthenticated || !user) {
      throw new Error('User not authenticated');
    }

    try {
      const response = await fetch(`${apiUrl}/users/${user.address}/addresses`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, address })
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          // Refresh user data to get updated addresses
          await refreshUserData();
          addDebugInfo(`✅ Added address: ${name} (${address.slice(0, 8)}...)`);
          return data.address;
        }
      }
      
      throw new Error('Failed to add address');
    } catch (error) {
      console.error('❌ Failed to add address:', error);
      addDebugInfo(`❌ Failed to add address: ${error instanceof Error ? error.message : 'Unknown error'}`);
      throw error;
    }
  };

  const removeUserAddress = async (addressId: string) => {
    if (!isAuthenticated || !user) {
      throw new Error('User not authenticated');
    }

    try {
      const response = await fetch(`${apiUrl}/users/${user.address}/addresses/${addressId}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          // Refresh user data to get updated addresses
          await refreshUserData();
          addDebugInfo(`✅ Removed address: ${addressId}`);
          return data;
        }
      }
      
      throw new Error('Failed to remove address');
    } catch (error) {
      console.error('❌ Failed to remove address:', error);
      addDebugInfo(`❌ Failed to remove address: ${error instanceof Error ? error.message : 'Unknown error'}`);
      throw error;
    }
  };

  const refreshUserData = async () => {
    if (!isAuthenticated || !user) return;

    try {
      const response = await fetch(`${apiUrl}/users/profile/${user.address}`);
      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setUser(data.user);
        }
      }
    } catch (error) {
      console.error('❌ Failed to refresh user data:', error);
    }
  };

  const getUserJobs = async (limit = 20, offset = 0) => {
    if (!isAuthenticated || !user) {
      throw new Error('User not authenticated');
    }

    try {
      const response = await fetch(`${apiUrl}/users/${user.address}/jobs?limit=${limit}&offset=${offset}`);
      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          return data;
        }
      }
      
      throw new Error('Failed to get user jobs');
    } catch (error) {
      console.error('❌ Failed to get user jobs:', error);
      addDebugInfo(`❌ Failed to get user jobs: ${error instanceof Error ? error.message : 'Unknown error'}`);
      throw error;
    }
  };

  // Load initial data
  useEffect(() => {
    fetchJobs();
    fetchLiveDataStats(); // Use live data stats instead of just transfers
    getStats();
  }, [fetchJobs, fetchLiveDataStats, getStats]); // Add dependencies

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
    
    // User data
    user,
    isAuthenticated,
    
    // Job management
    createJob,
    fetchJobs,
    forceRefreshJobs, // Add this for debugging
    fetchTransfers, // Add this to the return object
    fetchLiveDataStats, // Add live data stats function
    getStats,
    
    // User management
    authenticateUser,
    addUserAddress,
    removeUserAddress,
    refreshUserData,
    getUserJobs,
    
    // Chat functionality
    sendChatMessage,
    getChatSuggestions,
    
    // Utilities
    addDebugInfo,
  };
};