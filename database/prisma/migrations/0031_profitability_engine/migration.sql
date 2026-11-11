-- CreateTable
CREATE TABLE "BatchProfitability" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "factoryId" TEXT NOT NULL,
    "batchId" TEXT NOT NULL,
    "batchNumber" TEXT NOT NULL,
    "paddyCost" DECIMAL(18,4) NOT NULL,
    "processingCost" DECIMAL(18,4) NOT NULL DEFAULT 0,
    "labourCost" DECIMAL(18,4) NOT NULL DEFAULT 0,
    "electricityCost" DECIMAL(18,4) NOT NULL DEFAULT 0,
    "packagingCost" DECIMAL(18,4) NOT NULL DEFAULT 0,
    "transportCost" DECIMAL(18,4) NOT NULL DEFAULT 0,
    "overheadCost" DECIMAL(18,4) NOT NULL DEFAULT 0,
    "byProductRevenue" DECIMAL(18,4) NOT NULL DEFAULT 0,
    "netRiceCost" DECIMAL(18,4) NOT NULL,
    "finishedRiceKg" DECIMAL(18,3) NOT NULL,
    "costPerKg" DECIMAL(18,4) NOT NULL,
    "costPerMon" DECIMAL(18,4) NOT NULL,
    "costPerTon" DECIMAL(18,4) NOT NULL,
    "projectedRevenue" DECIMAL(18,4) NOT NULL,
    "grossProfit" DECIMAL(18,4) NOT NULL,
    "grossMarginPct" DECIMAL(7,3) NOT NULL,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BatchProfitability_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "BatchProfitability_batchId_key" ON "BatchProfitability"("batchId");

-- CreateIndex
CREATE UNIQUE INDEX "BatchProfitability_companyId_factoryId_batchId_key" ON "BatchProfitability"("companyId", "factoryId", "batchId");

-- CreateIndex
CREATE INDEX "BatchProfitability_companyId_factoryId_batchNumber_idx" ON "BatchProfitability"("companyId", "factoryId", "batchNumber");

-- AddForeignKey
ALTER TABLE "BatchProfitability" ADD CONSTRAINT "BatchProfitability_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BatchProfitability" ADD CONSTRAINT "BatchProfitability_companyId_factoryId_fkey" FOREIGN KEY ("companyId", "factoryId") REFERENCES "Factory"("companyId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BatchProfitability" ADD CONSTRAINT "BatchProfitability_companyId_factoryId_batchId_fkey" FOREIGN KEY ("companyId", "factoryId", "batchId") REFERENCES "ProductionBatch"("companyId", "factoryId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;
