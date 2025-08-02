import { useState, useEffect } from 'react';
import io, { Socket } from 'socket.io-client';

interface Job {
  jobId: string;
  message: string;
  progress: number;
  status: string;
  timestamp: Date;
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

  // Helper function to add debug messages
  const addDebugInfo = (message: string) => {
    const timestamp = new Date().toLocaleTimeString();
    setDebugInfo(prev => [`${timestamp}: ${message}`, ...prev.slice(0, 19)]);
  };

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

    // Job progress updates (global)
    newSocket.on('job-progress-global', (data: any) => {
      console.log('📊 Job Progress:', data);
      addDebugInfo(`Job progress: ${data.jobId?.slice(0, 8)}... - ${data.progress}%`);
      
      setJobs((prevJobs: Job[]) => {
        const existingIndex = prevJobs.findIndex((job) => job.jobId === data.jobId);
        
        if (existingIndex >= 0) {
          // Update existing job
          const updated = [...prevJobs];
          updated[existingIndex] = { 
            ...updated[existingIndex], 
            ...data,
            timestamp: new Date(data.timestamp || new Date())
          };
          
          // Remove completed jobs after a delay
          if (data.status === 'completed' || data.progress >= 100) {
            setTimeout(() => {
              setJobs(prev => prev.filter(job => job.jobId !== data.jobId));
              addDebugInfo(`Removed completed job: ${data.jobId?.slice(0, 8)}...`);
            }, 10000); // Keep visible for 10 seconds
          }
          
          return updated;
        } else {
          // Add new job
          const newJob: Job = {
            jobId: data.jobId,
            message: data.message || 'Processing...',
            progress: data.progress || 0,
            status: data.status || 'active',
            timestamp: new Date(data.timestamp || new Date())
          };
          addDebugInfo(`Added new job: ${data.jobId?.slice(0, 8)}...`);
          return [...prevJobs, newJob];
        }
      });
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
      newSocket.close();
    };
  }, []);

  // Function to create a new indexing job
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
      
      // Subscribe to job updates
      if (socket && result.jobId) {
        socket.emit('subscribe-to-job', { jobId: result.jobId });
        addDebugInfo(`Subscribed to job: ${result.jobId.slice(0, 8)}...`);
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

  // Function to get system stats
  const getStats = () => {
    if (socket) {
      socket.emit('get-stats');
      addDebugInfo('Requested WebSocket stats');
    }
  };

  return {
    // Connection state
    isConnected,
    connectedClients,
    
    // Data
    jobs,
    transfers,
    systemStatus,
    debugInfo,
    
    // Actions
    createJob,
    fetchJobs,
    getStats,
    
    // Socket instance (for advanced usage)
    socket,
  };
};