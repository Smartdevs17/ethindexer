-- AlterTable
ALTER TABLE "ApiEndpoint" ADD COLUMN     "jobId" TEXT;

-- CreateIndex
CREATE INDEX "ApiEndpoint_jobId_idx" ON "ApiEndpoint"("jobId");

-- AddForeignKey
ALTER TABLE "ApiEndpoint" ADD CONSTRAINT "ApiEndpoint_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "IndexingJob"("id") ON DELETE SET NULL ON UPDATE CASCADE;
