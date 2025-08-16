-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "ensName" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserAddress" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UserAddress_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Transfer" (
    "id" TEXT NOT NULL,
    "blockNumber" TEXT NOT NULL,
    "txHash" TEXT NOT NULL,
    "from" TEXT NOT NULL,
    "to" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "tokenId" TEXT NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL,
    "gasUsed" TEXT,
    "gasPrice" TEXT,
    "indexed" BOOLEAN NOT NULL DEFAULT true,
    "tier" TEXT NOT NULL DEFAULT 'hot',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Transfer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Token" (
    "id" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "name" TEXT,
    "symbol" TEXT,
    "decimals" INTEGER,
    "totalSupply" TEXT,
    "indexingTier" TEXT NOT NULL DEFAULT 'on-demand',
    "isPopular" BOOLEAN NOT NULL DEFAULT false,
    "lastIndexed" TIMESTAMP(3),
    "userRequests" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Token_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "IndexingJob" (
    "id" TEXT NOT NULL,
    "query" TEXT NOT NULL,
    "config" JSONB NOT NULL,
    "status" TEXT NOT NULL,
    "priority" TEXT NOT NULL DEFAULT 'normal',
    "tier" TEXT NOT NULL DEFAULT 'warm',
    "fromBlock" TEXT,
    "toBlock" TEXT,
    "addresses" TEXT[],
    "events" TEXT[],
    "progress" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "blocksProcessed" TEXT NOT NULL DEFAULT '0',
    "estimatedBlocks" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "completedAt" TIMESTAMP(3),
    "userId" TEXT,

    CONSTRAINT "IndexingJob_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ApiEndpoint" (
    "id" TEXT NOT NULL,
    "path" TEXT NOT NULL,
    "query" TEXT NOT NULL,
    "sqlQuery" TEXT NOT NULL,
    "parameters" JSONB NOT NULL,
    "description" TEXT,
    "tier" TEXT NOT NULL DEFAULT 'warm',
    "cacheTime" INTEGER NOT NULL DEFAULT 300,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastUsed" TIMESTAMP(3),
    "useCount" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "ApiEndpoint_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "IndexingMetrics" (
    "id" TEXT NOT NULL,
    "tokenAddress" TEXT NOT NULL,
    "blockRange" TEXT NOT NULL,
    "tier" TEXT NOT NULL,
    "transferCount" TEXT NOT NULL,
    "indexingTime" INTEGER NOT NULL,
    "storageSize" TEXT NOT NULL,
    "queryCount" INTEGER NOT NULL DEFAULT 0,
    "lastAccessed" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "IndexingMetrics_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_address_key" ON "User"("address");

-- CreateIndex
CREATE INDEX "User_address_idx" ON "User"("address");

-- CreateIndex
CREATE INDEX "UserAddress_address_idx" ON "UserAddress"("address");

-- CreateIndex
CREATE UNIQUE INDEX "UserAddress_userId_address_key" ON "UserAddress"("userId", "address");

-- CreateIndex
CREATE INDEX "Transfer_from_idx" ON "Transfer"("from");

-- CreateIndex
CREATE INDEX "Transfer_to_idx" ON "Transfer"("to");

-- CreateIndex
CREATE INDEX "Transfer_blockNumber_idx" ON "Transfer"("blockNumber");

-- CreateIndex
CREATE INDEX "Transfer_timestamp_idx" ON "Transfer"("timestamp");

-- CreateIndex
CREATE INDEX "Transfer_tier_timestamp_idx" ON "Transfer"("tier", "timestamp");

-- CreateIndex
CREATE UNIQUE INDEX "Token_address_key" ON "Token"("address");

-- CreateIndex
CREATE INDEX "Token_isPopular_idx" ON "Token"("isPopular");

-- CreateIndex
CREATE INDEX "Token_userRequests_idx" ON "Token"("userRequests");

-- CreateIndex
CREATE INDEX "IndexingJob_status_priority_idx" ON "IndexingJob"("status", "priority");

-- CreateIndex
CREATE INDEX "IndexingJob_tier_idx" ON "IndexingJob"("tier");

-- CreateIndex
CREATE INDEX "IndexingJob_userId_idx" ON "IndexingJob"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "ApiEndpoint_path_key" ON "ApiEndpoint"("path");

-- CreateIndex
CREATE INDEX "ApiEndpoint_tier_idx" ON "ApiEndpoint"("tier");

-- CreateIndex
CREATE INDEX "ApiEndpoint_useCount_idx" ON "ApiEndpoint"("useCount");

-- CreateIndex
CREATE INDEX "IndexingMetrics_tokenAddress_idx" ON "IndexingMetrics"("tokenAddress");

-- CreateIndex
CREATE INDEX "IndexingMetrics_tier_idx" ON "IndexingMetrics"("tier");

-- CreateIndex
CREATE INDEX "IndexingMetrics_queryCount_idx" ON "IndexingMetrics"("queryCount");

-- AddForeignKey
ALTER TABLE "UserAddress" ADD CONSTRAINT "UserAddress_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Transfer" ADD CONSTRAINT "Transfer_tokenId_fkey" FOREIGN KEY ("tokenId") REFERENCES "Token"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IndexingJob" ADD CONSTRAINT "IndexingJob_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
