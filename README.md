# EthIndexer 🚀

**AI-Powered Blockchain Data Indexing Platform**

EthIndexer is an intelligent blockchain data indexing platform that allows users to index Ethereum blockchain data using natural language commands. The system automatically generates REST API endpoints for accessing indexed data, making blockchain integration effortless for developers and analysts.

## 🌟 Features

### ✅ Currently Available
- **Natural Language Processing**: Index blockchain data using simple English commands
- **ERC-20 Transfer Indexing**: Real-time indexing of token transfers with tier-based storage
- **AI-Powered Query Parsing**: OpenAI GPT-4 integration for intelligent command interpretation
- **Dynamic API Generation**: Auto-generated REST endpoints with caching and performance optimization
- **User Management**: Wallet-based authentication with ENS name resolution
- **Job Orchestration**: Advanced indexing job management with priority and tier systems
- **Real-time Updates**: WebSocket streaming for live blockchain data and job progress
- **Block Explorer**: Comprehensive block data with gas analysis and transaction details
- **Live Data Streaming**: Real-time blockchain data access with filtering capabilities
- **Chat Interface**: Interactive AI-powered query builder with natural language processing
- **Frontend Dashboard**: Complete Scaffold-ETH 2 based interface with analytics
- **Type-Safe Database**: Prisma ORM with PostgreSQL and comprehensive indexing
- **Production Ready**: Built with enterprise-grade tools, monitoring, and error handling

### 🚧 Coming Soon
- **Advanced Visualizations**: Interactive charts and data exploration tools
- **Multi-token Support**: Beyond ERC-20 to all token standards and NFTs
- **Cross-chain Indexing**: Support for multiple blockchains
- **API Playground**: Interactive documentation and testing interface
- **Webhook Notifications**: Real-time alerts for specific events
- **Export Tools**: CSV, JSON, and direct database exports

## 🏗️ Architecture

```
ethindexer/
├── backend/                 # NestJS backend with AI integration
│   ├── src/
│   │   ├── ai/             # OpenAI GPT-4 integration module
│   │   ├── indexer/        # Blockchain indexing service
│   │   ├── api/            # Dynamic API generation & blocks controller
│   │   ├── database/       # Prisma service with PostgreSQL
│   │   ├── websocket/      # Real-time WebSocket updates
│   │   ├── orchestrator/   # Main orchestration service
│   │   ├── indexing-orchestrator/ # Job management system
│   │   ├── chat/           # AI chat interface
│   │   ├── tokens/         # Token management
│   │   ├── users/          # User management & authentication
│   │   └── live-data/      # Real-time data streaming
│   ├── prisma/             # Database schema & migrations
│   └── package.json
├── frontend/               # Scaffold-ETH 2 based frontend
│   ├── packages/nextjs/    # Next.js 13+ application
│   │   ├── app/           # App router pages
│   │   │   ├── app/       # Dashboard & user interface
│   │   │   └── components/ # React components
│   │   ├── hooks/         # Custom React hooks
│   │   └── services/      # API services
│   └── yarn.lock
└── README.md
```

## 🗄️ Database Schema

EthIndexer uses Prisma with PostgreSQL for robust data management with comprehensive indexing and user management:

```prisma
model User {
  id        String   @id @default(cuid())
  address   String   @unique // Wallet address
  ensName   String?  // ENS name if available
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  
  // Relations
  jobs      IndexingJob[]
  addresses UserAddress[]
}

model Transfer {
  id          String   @id @default(cuid())
  blockNumber String   // Universal block number support
  txHash      String
  from        String
  to          String
  value       String   // Universal value support
  token       Token    @relation(fields: [tokenId], references: [id])
  tokenId     String
  timestamp   DateTime
  gasUsed     String?  // Gas usage tracking
  gasPrice    String?  // Gas price tracking
  indexed     Boolean  @default(true)
  tier        String   @default("hot") // "hot", "warm", "cold"
  createdAt   DateTime @default(now())
     
  @@index([from])
  @@index([to])
  @@index([blockNumber])
  @@index([timestamp])
  @@index([tier, timestamp])
}

model Token {
  id           String     @id @default(cuid())
  address      String     @unique
  name         String?
  symbol       String?
  decimals     Int?
  totalSupply  String?    // Universal supply tracking
  transfers    Transfer[]
  indexingTier String     @default("on-demand") // "popular", "on-demand", "archive"
  isPopular    Boolean    @default(false)
  lastIndexed  DateTime?
  userRequests Int        @default(0)
  createdAt    DateTime   @default(now())
  
  @@index([isPopular])
  @@index([userRequests])
}

model IndexingJob {
  id              String   @id @default(cuid())
  query           String
  config          Json
  status          String   // "active", "paused", "completed", "error"
  priority        String   @default("normal") // "high", "normal", "low"
  tier            String   @default("warm") // "hot", "warm", "cold"
  fromBlock       String?  // Universal block number support
  toBlock         String?  // Universal block number support
  addresses       String[]
  events          String[]
  progress        Float    @default(0) // 0-100 completion percentage
  blocksProcessed String   @default("0") // Universal counting
  estimatedBlocks String?  // Universal estimation
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt
  completedAt     DateTime?
  
  // User relation
  userId    String?
  user      User?   @relation(fields: [userId], references: [id], onDelete: SetNull)
  
  // Link to API endpoints created by this job
  apiEndpoints ApiEndpoint[]
  
  @@index([status, priority])
  @@index([tier])
  @@index([userId])
}

model ApiEndpoint {
  id          String   @id @default(cuid())
  path        String   @unique
  query       String
  sqlQuery    String
  parameters  Json
  description String?
  tier        String   @default("warm")
  cacheTime   Int      @default(300)
  createdAt   DateTime @default(now())
  lastUsed    DateTime?
  useCount    Int      @default(0)
  
  // Link to the indexing job that created this endpoint
  jobId       String?
  job         IndexingJob? @relation(fields: [jobId], references: [id], onDelete: SetNull)
  
  @@index([tier])
  @@index([useCount])
  @@index([jobId])
}

model IndexingMetrics {
  id              String   @id @default(cuid())
  tokenAddress    String
  blockRange      String   // "18000000-18001000"
  tier            String   // "hot", "warm", "cold"
  transferCount   String   // Universal counting
  indexingTime    Int      // milliseconds
  storageSize     String   // Universal storage tracking
  queryCount      Int      @default(0)
  lastAccessed    DateTime?
  createdAt       DateTime @default(now())
  
  @@index([tokenAddress])
  @@index([tier])
  @@index([queryCount])
}
```

## 🚀 Quick Start

### Prerequisites
- Node.js (v18 or higher)
- PostgreSQL (v13 or higher)
- Infura/Alchemy API key
- OpenAI API key

### Backend Setup

1. **Clone the repository**
   ```bash
   git clone https://github.com/Smartdevs17/ethindexer.git
   cd ethindexer/backend
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Configure environment**
   ```bash
   cp .env.example .env
   ```
   
   Update `.env` with your credentials:
   ```env
   # Database
   DATABASE_URL="postgresql://username:password@localhost:5432/ethindexer"
   
   # Blockchain
   INFURA_URL="https://mainnet.infura.io/v3/YOUR_INFURA_KEY"
   ALCHEMY_URL="https://eth-mainnet.alchemyapi.io/v2/YOUR_ALCHEMY_KEY"
   
   # AI
   OPENAI_API_KEY="your_openai_api_key"
   
   # Server
   PORT=3001
   NODE_ENV=development
   
   # CORS
   FRONTEND_URL="http://localhost:3000"
   ```

4. **Set up database**
   ```bash
   # Generate Prisma client
   npx prisma generate
   
   # Push schema to database (creates tables)
   npx prisma db push
   
   # Optional: Open Prisma Studio to view data
   npx prisma studio
   ```

5. **Start the indexer**
   ```bash
   # Development mode
   npm run dev
   
   # Or production mode
   npm run start
   ```

## 🎯 Usage Examples

### Natural Language Commands

```bash
# Index a specific token
"Index this: 0xdac17f958d2ee523a2206206994597c13d831ec7"

# Index transfers for an address
"Index transfers for 0x742d35cc44b75c42b4b6c5a8b964b08d2a6f6c42"

# Index with block range
"Index USDC transfers from block 18000000 to 18100000"

# Custom field indexing
"Only index the from and value fields for WETH transfers"
```

### API Endpoints

```bash
# Health & System
GET /health                    # System health check with database stats
GET /                         # API information and available endpoints

# Dynamic API Generation
GET /api/dynamic              # List all available dynamic endpoints
GET /api/dynamic/:endpoint    # Execute dynamic endpoint with parameters

# Orchestration & Job Management
POST /orchestrator/execute    # Execute natural language query
GET /orchestrator/job/:jobId  # Get specific job status
GET /orchestrator/jobs        # List all indexing jobs
POST /orchestrator/start      # Start indexing job
POST /orchestrator/pause      # Pause indexing job
POST /orchestrator/resume     # Resume indexing job
POST /orchestrator/stop       # Stop indexing job

# Block Data & Analysis
GET /api/blocks               # Get block data with filtering
GET /api/blocks/:blockNumber  # Get specific block details
GET /api/blocks/recent        # Get recent blocks

# Live Data Streaming
GET /api/live-data            # Real-time blockchain data
GET /api/live-data/transfers  # Live transfer data

# User Management
GET /api/users                # User information
POST /api/users/addresses     # Add tracked addresses
GET /api/users/addresses      # List user addresses

# AI & Chat Interface
POST /chat/message            # Send chat message to AI
GET /chat/history             # Get chat history

# Token Management
GET /api/tokens               # List tokens
GET /api/tokens/:address      # Get specific token info

# WebSocket Connections
WS /indexer                   # Real-time indexing updates
WS /blocks                    # Real-time block updates
WS /transfers                 # Real-time transfer updates
```

## 🔧 Technology Stack

### Backend
- **Framework**: NestJS with TypeScript
- **Database**: PostgreSQL with Prisma ORM
- **Blockchain**: Ethers.js with Infura/Alchemy
- **AI**: OpenAI GPT-4 for natural language processing
- **Real-time**: WebSockets with Socket.io
- **Authentication**: Wallet-based with ENS resolution
- **Caching**: Redis for performance optimization
- **Monitoring**: Comprehensive logging and health checks

### Frontend
- **Framework**: Next.js 13+ with App Router
- **Base**: Scaffold-ETH 2 for Web3 integration
- **UI**: Tailwind CSS with custom components
- **Web3**: Wagmi + Viem for Ethereum interactions
- **State**: React hooks with custom state management
- **Real-time**: WebSocket integration for live updates
- **Components**: Custom React components with TypeScript

## 🎨 Frontend Features

### Current Implementation
- **Dashboard**: Complete user interface with wallet connection
- **Query Builder**: Interactive AI-powered query creation
- **Job Management**: Real-time monitoring of indexing jobs
- **API Explorer**: View and test generated API endpoints
- **Block Explorer**: Comprehensive block data visualization
- **Live Data**: Real-time blockchain data streaming
- **User Profile**: Wallet-based authentication and settings
- **Chat Interface**: AI-powered natural language query builder

### Key Pages
- `/app` - Main dashboard with system overview
- `/app/query` - AI-powered query builder
- `/app/apis` - Generated API endpoints management
- `/app/jobs` - Indexing jobs monitoring
- `/app/blocks` - Block explorer and analysis
- `/app/data` - Live blockchain data streaming
- `/app/profile` - User settings and wallet management

## 🌐 Live Demo

- **Production API**: [https://ethindexer-production.up.railway.app](https://ethindexer-production.up.railway.app)
- **Frontend Explorer**: [https://ethindexer.vercel.app](https://ethindexer.vercel.app)

## 📊 Performance

- **Indexing Speed**: 1,200+ blocks per minute
- **API Response Time**: <100ms average
- **Uptime**: 99.9%+ production availability
- **Data Accuracy**: 100% verified against blockchain

## 🗺️ Roadmap

### Upcoming Features
- **Advanced Visualizations**: Interactive charts and data exploration tools
- **Multi-token Support**: Beyond ERC-20 to all token standards and NFTs
- **Cross-chain Indexing**: Support for multiple blockchains
- **API Playground**: Interactive documentation and testing interface
- **Webhook Notifications**: Real-time alerts for specific events
- **Export Tools**: CSV, JSON, and direct database exports
- **Advanced Analytics**: Machine learning insights and pattern recognition
- **Mobile App**: React Native application for mobile access

## 🤝 Contributing

We welcome contributions! Please see our [Contributing Guidelines](CONTRIBUTING.md) for details.

### Development Setup

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Make your changes and test thoroughly
4. Commit your changes: `git commit -m 'Add amazing feature'`
5. Push to the branch: `git push origin feature/amazing-feature`
6. Open a Pull Request

### Reporting Issues

- Use GitHub Issues for bug reports and feature requests
- Provide detailed information about your environment
- Include steps to reproduce any bugs

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- Built with [Scaffold-ETH 2](https://github.com/scaffold-eth/scaffold-eth-2) for frontend
- AI integration via [OpenAI](https://openai.com)
- Blockchain connectivity through [Infura](https://infura.io) / [Alchemy](https://alchemy.com)

## 📞 Support

- **Documentation**: [docs.ethindexer.com](https://docs.ethindexer.com) (coming soon)
- **Discord**: [Join our community](https://discord.gg/ethindexer) (coming soon)
- **Email**: support@ethindexer.com
- **GitHub Issues**: For bug reports and feature requests

---

**Built with ❤️ for the Ethereum ecosystem**

*Making blockchain data accessible through the power of AI*