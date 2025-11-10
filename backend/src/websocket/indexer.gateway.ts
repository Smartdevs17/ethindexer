import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger } from '@nestjs/common';

// Event interfaces
export interface JobProgressEvent {
  jobId: string;
  progress: number;
  status: string;
  message: string;
  timestamp: Date;
}

export interface NewTransferEvent {
  id: string;
  txHash: string;
  from: string;
  to: string;
  value: string;
  token: {
    address: string;
    symbol?: string;
    name?: string;
  };
  blockNumber: string;
  timestamp: Date;
}

export interface ApiCreatedEvent {
  jobId: string;
  path: string;
  query: string;
  description?: string;
  timestamp: Date;
}

export interface SystemStatusEvent {
  message: string;
  stage: string;
  jobId?: string;
  timestamp: Date;
}

@WebSocketGateway({
  namespace: '/indexer',
  cors: {
    origin: [
      'https://ethindexer.vercel.app',
      process.env.FRONTEND_URL || 'http://localhost:3000',
      'http://127.0.0.1:5500',
      'http://localhost:3001',
    ],
    credentials: true,
  },
})
export class IndexerGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(IndexerGateway.name);
  private connectedClients = new Map<string, Socket>();

  /**
   * Lifecycle hook to ensure server is properly initialized
   */
  afterInit(server: Server) {
    this.logger.log('🔌 WebSocket Gateway initialized successfully');
    this.server = server;
  }

  handleConnection(client: Socket) {
    this.logger.log(`🔌 Client connected: ${client.id}`);
    this.connectedClients.set(client.id, client);

    // Send welcome message
    client.emit('system-status', {
      message: 'Connected to EthIndexer real-time updates',
      stage: 'connected',
      timestamp: new Date(),
    });

    // Send current stats
    this.sendConnectionStats();
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`🔌 Client disconnected: ${client.id}`);
    this.connectedClients.delete(client.id);
    this.sendConnectionStats();
  }

  /**
   * Client subscribes to specific job updates
   */
  @SubscribeMessage('subscribe-to-job')
  handleSubscribeToJob(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { jobId: string }
  ) {
    const room = `job-${data.jobId}`;
    client.join(room);
    this.logger.log(`📻 Client ${client.id} subscribed to job ${data.jobId}`);
    
    client.emit('subscription-confirmed', {
      jobId: data.jobId,
      room,
      message: `Subscribed to job ${data.jobId} updates`,
      timestamp: new Date(),
    });
  }

  /**
   * Client unsubscribes from job updates
   */
  @SubscribeMessage('unsubscribe-from-job')
  handleUnsubscribeFromJob(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { jobId: string }
  ) {
    const room = `job-${data.jobId}`;
    client.leave(room);
    this.logger.log(`📻 Client ${client.id} unsubscribed from job ${data.jobId}`);
    
    client.emit('unsubscription-confirmed', {
      jobId: data.jobId,
      room,
      message: `Unsubscribed from job ${data.jobId} updates`,
      timestamp: new Date(),
    });
  }

  /**
   * Get connection statistics
   */
  @SubscribeMessage('get-stats')
  handleGetStats(@ConnectedSocket() client: Socket) {
    const stats = {
      connectedClients: this.connectedClients.size,
      timestamp: new Date(),
    };
    
    client.emit('stats', stats);
    return stats;
  }

  // ===== EMIT METHODS (called by services) =====

  /**
   * Emit job progress updates to subscribers
   */
  emitJobProgress(data: JobProgressEvent) {
    const room = `job-${data.jobId}`;
    
    // Check if server is properly initialized
    if (!this.server) {
      this.logger.error('❌ WebSocket server not initialized');
      return;
    }
    
    this.server.to(room).emit('job-progress', data);
    
    // Also emit to all clients for global updates
    this.server.emit('job-progress-global', data);
    
    // ENHANCED LOGGING with safe room size check
    this.logger.log(`📡 EMITTED job-progress-global: ${data.jobId.slice(0, 8)}... - ${data.progress}% - ${data.message}`);
    this.logger.log(`👥 Connected clients: ${this.connectedClients.size}`);
    
    // Safe room size check
    try {
      const roomSize = this.server.sockets?.adapter?.rooms?.get(room)?.size || 0;
      this.logger.log(`🏠 Room ${room} clients: ${roomSize}`);
    } catch (error) {
      this.logger.warn(`⚠️ Could not get room size for ${room}: ${error.message}`);
    }
    
    this.logger.log(`📊 Job progress: ${data.jobId} - ${data.progress}%`);
  }

  /**
   * Emit new transfer events (real-time blockchain data)
   */
  emitNewTransfer(data: NewTransferEvent) {
    if (!this.server) {
      this.logger.error('❌ WebSocket server not initialized for transfer emit');
      return;
    }
    this.server.emit('new-transfer', data);
    this.logger.log(`💰 New transfer: ${data.value} ${data.token.symbol || 'tokens'} - ${data.txHash.slice(0, 10)}...`);
  }

  /**
   * Emit API creation events
   */
  emitApiCreated(data: ApiCreatedEvent) {
    if (!this.server) {
      this.logger.error('❌ WebSocket server not initialized for API emit');
      return;
    }
    this.server.emit('api-created', data);
    this.logger.log(`🔗 New API created: ${data.path}`);
  }

  /**
   * Emit system status updates
   */
  emitSystemStatus(data: SystemStatusEvent) {
    if (!this.server) {
      this.logger.error('❌ WebSocket server not initialized for system status emit');
      return;
    }
    this.server.emit('system-status', data);
    this.logger.log(`📢 EMITTED system-status: ${data.stage} - ${data.message}`);
    this.logger.log(`🚀 System: ${data.message}`);
  }

  /**
   * Emit indexing statistics updates
   */
  emitIndexingStats(data: {
    totalTransfers: number;
    activeJobs: number;
    popularTokens: number;
    latestBlock: number;
    timestamp: Date;
  }) {
    if (!this.server) {
      this.logger.error('❌ WebSocket server not initialized for stats emit');
      return;
    }
    this.server.emit('indexing-stats', data);
  }

  /**
   * Emit blockchain status updates
   */
  emitBlockchainStatus(data: {
    latestBlock: number;
    provider: string;
    networkId: number;
    timestamp: Date;
  }) {
    if (!this.server) {
      this.logger.error('❌ WebSocket server not initialized for blockchain status emit');
      return;
    }
    this.server.emit('blockchain-status', data);
  }

  // ===== UTILITY METHODS =====

  /**
   * Get number of connected clients
   */
  getConnectedClientsCount(): number {
    return this.connectedClients.size;
  }

  /**
   * Send connection statistics to all clients
   */
  private sendConnectionStats() {
    if (!this.server) {
      this.logger.error('❌ WebSocket server not initialized for connection stats');
      return;
    }
    
    const stats = {
      connectedClients: this.connectedClients.size,
      timestamp: new Date(),
    };
    
    this.server.emit('connection-stats', stats);
  }

  /**
   * Broadcast message to all connected clients
   */
  broadcast(event: string, data: any) {
    if (!this.server) {
      this.logger.error('❌ WebSocket server not initialized for broadcast');
      return;
    }
    this.server.emit(event, data);
  }

  /**
   * Send message to specific client
   */
  sendToClient(clientId: string, event: string, data: any) {
    const client = this.connectedClients.get(clientId);
    if (client) {
      client.emit(event, data);
    }
  }

  /**
   * Send message to clients in a specific room
   */
  sendToRoom(room: string, event: string, data: any) {
    this.server.to(room).emit(event, data);
  }
}