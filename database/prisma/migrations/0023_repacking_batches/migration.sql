CREATE TABLE "RepackingBatch" (
  "id" TEXT NOT NULL,
  "companyId" TEXT NOT NULL,
  "factoryId" TEXT NOT NULL,
  "batchNumber" TEXT NOT NULL,
  "sourceItemId" TEXT NOT NULL,
  "outputItemId" TEXT NOT NULL,
  "packagingItemId" TEXT NOT NULL,
  "sourceStackId" TEXT NOT NULL,
  "destinationStackId" TEXT NOT NULL,
  "inputQuantityKg" DECIMAL(18,3) NOT NULL,
  "packageSizeKg" DECIMAL(14,3) NOT NULL,
  "packageCount" INTEGER NOT NULL,
  "packedQuantityKg" DECIMAL(18,3) NOT NULL,
  "packingLossKg" DECIMAL(18,3) NOT NULL,
  "status" "DocumentStatus" NOT NULL DEFAULT 'DRAFT',
  "remarks" TEXT,
  "createdById" TEXT NOT NULL,
  "approvedById" TEXT,
  "approvedAt" TIMESTAMP(3),
  "postedById" TEXT,
  "postedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "RepackingBatch_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "RepackingBatch_companyId_batchNumber_key" ON "RepackingBatch"("companyId", "batchNumber");
CREATE UNIQUE INDEX "RepackingBatch_companyId_factoryId_id_key" ON "RepackingBatch"("companyId", "factoryId", "id");
CREATE INDEX "RepackingBatch_companyId_factoryId_status_createdAt_idx" ON "RepackingBatch"("companyId", "factoryId", "status", "createdAt");
ALTER TABLE "RepackingBatch" ADD CONSTRAINT "RepackingBatch_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "RepackingBatch" ADD CONSTRAINT "RepackingBatch_companyId_factoryId_fkey" FOREIGN KEY ("companyId", "factoryId") REFERENCES "Factory"("companyId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "RepackingBatch" ADD CONSTRAINT "RepackingBatch_companyId_sourceItemId_fkey" FOREIGN KEY ("companyId", "sourceItemId") REFERENCES "Item"("companyId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "RepackingBatch" ADD CONSTRAINT "RepackingBatch_companyId_outputItemId_fkey" FOREIGN KEY ("companyId", "outputItemId") REFERENCES "Item"("companyId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "RepackingBatch" ADD CONSTRAINT "RepackingBatch_companyId_packagingItemId_fkey" FOREIGN KEY ("companyId", "packagingItemId") REFERENCES "Item"("companyId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "RepackingBatch" ADD CONSTRAINT "RepackingBatch_companyId_factoryId_sourceStackId_fkey" FOREIGN KEY ("companyId", "factoryId", "sourceStackId") REFERENCES "Stack"("companyId", "factoryId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "RepackingBatch" ADD CONSTRAINT "RepackingBatch_companyId_factoryId_destinationStackId_fkey" FOREIGN KEY ("companyId", "factoryId", "destinationStackId") REFERENCES "Stack"("companyId", "factoryId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "RepackingBatch" ADD CONSTRAINT "RepackingBatch_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "RepackingBatch" ADD CONSTRAINT "RepackingBatch_approvedById_fkey" FOREIGN KEY ("approvedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "RepackingBatch" ADD CONSTRAINT "RepackingBatch_postedById_fkey" FOREIGN KEY ("postedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
