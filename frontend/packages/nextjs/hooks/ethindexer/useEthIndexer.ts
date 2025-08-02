import { useState, useEffect, useRef } from 'react';
import io, { Socket } from 'socket.io-client';

interface Job {
  jobId: string;
  message: string;
  progress: number;
  status: string;
  timestamp: Date;
  isLocal?: boolean; // Track if this is a locally created job
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

interface ConnectionStats {
  connectedClients: number;
  timestamp: Date;
}

export const useEthIndexer = () => {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [transfers, setTransfers] = useState<Transfer[]>([]);
  const [systemStatus, setSystemStatus] = useState('');
  const [connectedClients, setConnectedClients] = useState(0);
  const [debugInfo, setDebugInfo] = useState<string[]>([]);
  
  // Track jobs that we've created locally to avoid duplicates
  const localJobsRef = useRef<Set<string>>(new Set());
  
  // Track job removal timeouts
  const jobTimeoutsRef = useRef<Map<string, NodeJS.Timeout>>(new Map());

  // Helper function to add debug messages
  const addDebugInfo = (message: string) => {
    const timestamp = new Date().toLocaleTimeString();
    setDebugInfo(prev => [`${timestamp}: ${message}`, ...prev.slice(0, 19)]);
  };

  // Clean up function for job timeouts
  const clearJobTimeout = (jobId: string) => {
    const timeout = jobTimeoutsRef.current.get(jobId);
    if (timeout) {
      clearTimeout(timeout);
      jobTimeoutsRef.current.delete(jobId);
    }
  };

  // Function to schedule job removal
  const scheduleJobRemoval = (jobId: string, delay: number = 45000) => {
    // Clear any existing timeout for this job
    clearJobTimeout(jobId);
    
    const timeout = setTimeout(() => {
      setJobs(prev => prev.filter(job => job.jobId !== jobId));
      localJobsRef.current.delete(jobId);
      jobTimeoutsRef.current.delete(jobId);
      addDebugInfo(`Auto-removed job: ${jobId.slice(0, 8)}...`);
    }, delay);
    
    jobTimeoutsRef.current.set(jobId, timeout);
  };

  // Load existing jobs from API on startup - FIXED FOR YOUR API STRUCTURE
  useEffect(() => {
    const loadExistingJobs = async () => {
      try {
        addDebugInfo('Loading existing jobs from API...');
        const response = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3001'}/orchestrator/jobs`);
        const result = await response.json();
        
        if (result.success && result.jobs) {
          const apiJobs = result.jobs.map((job: any) => ({
            jobId: job.jobId,
            message: job.message || `Status: ${job.status} (${job.progress}%)`,
            progress: job.progress || 0,
            status: job.status || 'unknown',
            timestamp: new Date(), // Use current time since API doesn't provide timestamp
            isLocal: false
          }));
          
          setJobs(apiJobs);
          addDebugInfo(`✅ Loaded ${apiJobs.length} jobs from API (${result.count} total)`);
          
          // Count active vs completed
          const activeCount = apiJobs.filter((job: any) => job.status === 'active').length;
          const completedCount = apiJobs.filter((job: any) => job.status === 'completed').length;
          addDebugInfo(`📊 Active: ${activeCount}, Completed: ${completedCount}`);
          
          // Schedule removal for completed jobs
          apiJobs.forEach((job: any) => {
            if (job.status === 'completed') {
              scheduleJobRemoval(job.jobId, 90000); // Remove completed jobs after 90s
            }
          });
        } else {
          addDebugInfo(`❌ API response invalid: ${JSON.stringify(result)}`);
        }
      } catch (error) {
        console.error('Failed to load existing jobs:', error);
        addDebugInfo(`❌ Failed to load jobs: ${error}`);
      }
    };

    loadExistingJobs();
  }, []);

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
    newSocket.on('system-status', (data: SystemStatus) => {
      console.log('🚀 System Status:', data);
      setSystemStatus(`${data.message} (${data.stage})`);
      addDebugInfo(`System: ${data.message}`);
    });

    // Job progress updates (global) - IMPROVED HANDLING with DEBUG
    newSocket.on('job-progress-global', (data: any) => {
      console.log('📊 Job Progress:', data);
      addDebugInfo(`🎯 RECEIVED job-progress-global: ${data.jobId?.slice(0, 8)}... - ${data.progress}%`);
      
      setJobs((prevJobs: Job[]) => {
        const existingIndex = prevJobs.findIndex((job) => job.jobId === data.jobId);
        
        if (existingIndex >= 0) {
          // Update existing job
          const updated = [...prevJobs];
          updated[existingIndex] = { 
            ...updated[existingIndex], 
            ...data,
            timestamp: new Date(data.timestamp || new Date()),
            // Preserve the isLocal flag
            isLocal: updated[existingIndex].isLocal
          };
          
          // Handle job completion with improved timing
          if (data.status === 'completed' || data.progress >= 100) {
            // Mark as completed but keep visible longer for fast jobs
            updated[existingIndex].status = 'completed';
            
            // Schedule removal with longer delay for visibility
            scheduleJobRemoval(data.jobId, 60000); // 60 seconds for completed jobs
            addDebugInfo(`Job completed, will remove in 60s: ${data.jobId?.slice(0, 8)}...`);
          }
          
          return updated;
        } else {
          // Only add if not a local job (avoid duplicates)
          if (!localJobsRef.current.has(data.jobId)) {
            const newJob: Job = {
              jobId: data.jobId,
              message: data.message || 'Processing...',
              progress: data.progress || 0,
              status: data.status || 'active',
              timestamp: new Date(data.timestamp || new Date()),
              isLocal: false
            };
            
            addDebugInfo(`Added WebSocket job: ${data.jobId?.slice(0, 8)}...`);
            
            // Schedule removal for new active jobs
            if (newJob.status === 'active') {
              scheduleJobRemoval(data.jobId, 90000); // 90 seconds for active jobs
            }
            
            return [...prevJobs, newJob];
          }
          
          return prevJobs;
        }
      });
    });

    // Add debug listener for ALL events to see what's actually received
    newSocket.onAny((eventName, ...args) => {
      if (eventName !== 'system-status') { // Don't spam with system-status
        addDebugInfo(`📡 WebSocket event: ${eventName} - ${JSON.stringify(args[0]).slice(0, 100)}...`);
      }
    });

    // Real-time transfer notifications
    newSocket.on('new-transfer', (transfer: any) => {
      console.log('💰 New Transfer:', transfer);
      addDebugInfo(`New transfer: ${transfer.value} ${transfer.token?.symbol || 'tokens'}`);
      
      setTransfers((prevTransfers: Transfer[]) => [
        {
          ...transfer,
          timestamp: new Date(transfer.timestamp),
        },
        ...prevTransfers.slice(0, 19), // Keep last 20 transfers
      ]);
    });

    // Connection statistics
    newSocket.on('connection-stats', (stats: ConnectionStats) => {
      setConnectedClients(stats.connectedClients);
    });

    // API creation events
    newSocket.on('api-created', (data: any) => {
      console.log('🔗 API Created:', data);
      addDebugInfo(`New API created: ${data.path}`);
    });

    // Subscription confirmation
    newSocket.on('subscription-confirmed', (data: any) => {
      addDebugInfo(`Subscribed to job: ${data.jobId?.slice(0, 8)}...`);
    });

    return () => {
      // Clear all timeouts on cleanup
      jobTimeoutsRef.current.forEach(timeout => clearTimeout(timeout));
      jobTimeoutsRef.current.clear();
      localJobsRef.current.clear();
      newSocket.close();
    };
  }, []);

  // IMPROVED Function to create a new indexing job - WORKS WITH YOUR API
  const createJob = async (query: string) => {
    if (!query.trim()) {
      throw new Error('Query cannot be empty');
    }

    addDebugInfo(`Creating job with query: ${query}`);

    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3001'}/orchestrator/execute`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      console.log('✅ Job created:', result);
      addDebugInfo(`Job creation response: ${result.success ? 'Success' : 'Failed'}`);
      
      // Get jobId from your API response structure
      const jobId = result.result?.jobId || result.jobId;
      
      // 🚀 IMMEDIATELY ADD JOB TO STATE WITH IMPROVED HANDLING
      if (jobId) {
        // Track this as a local job
        localJobsRef.current.add(jobId);
        
        const immediateJob: Job = {
          jobId: jobId,
          message: 'Job created, starting indexing...',
          progress: 0,
          status: 'active',
          timestamp: new Date(),
          isLocal: true // Mark as locally created
        };
        
        setJobs(prev => {
          // Remove any existing job with same ID (edge case protection)
          const filtered = prev.filter(job => job.jobId !== jobId);
          return [immediateJob, ...filtered];
        });
        
        addDebugInfo(`✅ Immediately added job: ${jobId.slice(0, 8)}...`);
        
        // Subscribe to job updates
        if (socket) {
          socket.emit('subscribe-to-job', { jobId: jobId });
          addDebugInfo(`📡 Subscribed to job: ${jobId.slice(0, 8)}...`);
        }
        
        // Schedule removal (as safety net)
        scheduleJobRemoval(jobId, 120000); // 2 minutes max
      } else {
        addDebugInfo(`⚠️ No jobId in response: ${JSON.stringify(result)}`);
      }
      
      return result;
    } catch (error) {
      console.error('❌ Failed to create job:', error);
      addDebugInfo(`Job creation failed: ${error}`);
      throw error;
    }
  };

  // Function to fetch jobs from API
  const fetchJobs = async () => {
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3001'}/orchestrator/jobs`);
      const result = await response.json();
      addDebugInfo(`Fetched ${result.jobs?.length || 0} jobs from API`);
      return result;
    } catch (error) {
      console.error('❌ Failed to fetch jobs:', error);
      addDebugInfo(`Failed to fetch jobs: ${error}`);
      throw error;
    }
  };

  // Function to refresh jobs from API (since WebSocket events aren't working reliably)
  const refreshJobs = async () => {
    try {
      const result = await fetchJobs();
      if (result.success && result.jobs) {
        const apiJobs = result.jobs.map((job: any) => ({
          jobId: job.jobId,
          message: job.message || `Status: ${job.status} (${job.progress}%)`,
          progress: job.progress || 0,
          status: job.status || 'unknown',
          timestamp: new Date(), // Use current time since API doesn't provide timestamp
          isLocal: localJobsRef.current.has(job.jobId) // Preserve local status
        }));
        
        setJobs(apiJobs);
        
        // Count active vs completed for debug
        const activeCount = apiJobs.filter((job: any) => job.status === 'active').length;
        const completedCount = apiJobs.filter((job: any) => job.status === 'completed').length;
        addDebugInfo(`🔄 Refreshed: ${apiJobs.length} total, ${activeCount} active, ${completedCount} completed`);
      }
    } catch (error) {
      addDebugInfo(`❌ Failed to refresh jobs: ${error}`);
    }
  };

  // Add polling for job updates (fallback since WebSocket job-progress-global isn't working)
  useEffect(() => {
    const interval = setInterval(refreshJobs, 3000); // Poll every 3 seconds (more aggressive)
    return () => clearInterval(interval);
  }, []);

  // Function to get system stats
  const getStats = () => {
    if (socket) {
      socket.emit('get-stats');
      addDebugInfo('Requested WebSocket stats');
    }
  };

  // Function to manually remove a job
  const removeJob = (jobId: string) => {
    clearJobTimeout(jobId);
    setJobs(prev => prev.filter(job => job.jobId !== jobId));
    localJobsRef.current.delete(jobId);
    addDebugInfo(`Manually removed job: ${jobId.slice(0, 8)}...`);
  };

  // Calculate active jobs count (jobs that are not completed/error)
  const activeJobsCount = jobs.filter(job => 
    job.status === 'active' || job.status === 'pending' || job.status === 'processing'
  ).length;

  // Calculate completed jobs count
  const completedJobsCount = jobs.filter(job => 
    job.status === 'completed'
  ).length;

  return {
    // Connection state
    isConnected,
    connectedClients,
    
    // Data
    jobs,
    transfers,
    systemStatus,
    debugInfo,
    
    // Computed values
    activeJobsCount,
    completedJobsCount,
    totalJobsCount: jobs.length,
    
    // Actions
    createJob,
    fetchJobs,
    refreshJobs, // New function to manually refresh jobs
    getStats,
    removeJob,
    
    // Socket instance (for advanced usage)
    socket,
  };
};