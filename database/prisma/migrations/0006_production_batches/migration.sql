CREATE TABLE "ProductionBatch" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "factoryId" TEXT NOT NULL,
    "batchNumber" TEXT NOT NULL,
    "inputItemId" TEXT NOT NULL,
    "inputStackId" TEXT NOT NULL,
    "inputQuantityKg" DECIMAL(18,3) NOT NULL,
    "totalOutputKg" DECIMAL(18,3) NOT NULL,
    "processLossKg" DECIMAL(18,3) NOT NULL,
    "headRiceRecoveryPct" DECIMAL(7,3) NOT NULL,
    "totalRiceRecoveryPct" DECIMAL(7,3) NOT NULL,
    "byProductRecoveryPct" DECIMAL(7,3) NOT NULL,
    "standardRecoveryPct" DECIMAL(7,3),
    "status" "DocumentStatus" NOT NULL DEFAULT 'DRAFT',
    "startedAt" TIMESTAMP(3) NOT NULL,
    "completedAt" TIMESTAMP(3) NOT NULL,
    "remarks" TEXT,
    "createdById" TEXT NOT NULL,
    "approvedById" TEXT,
    "approvedAt" TIMESTAMP(3),
    "postedById" TEXT,
    "postedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "ProductionBatch_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "ProductionBatch_input_quantity_check" CHECK ("inputQuantityKg" > 0),
    CONSTRAINT "ProductionBatch_output_quantity_check" CHECK ("totalOutputKg" >= 0 AND "totalOutputKg" <= "inputQuantityKg"),
    CONSTRAINT "ProductionBatch_loss_check" CHECK ("processLossKg" = "inputQuantityKg" - "totalOutputKg"),
    CONSTRAINT "ProductionBatch_recovery_check" CHECK (
        "headRiceRecoveryPct" BETWEEN 0 AND 100 AND
        "totalRiceRecoveryPct" BETWEEN 0 AND 100 AND
        "byProductRecoveryPct" BETWEEN 0 AND 100 AND
        ("standardRecoveryPct" IS NULL OR "standardRecoveryPct" BETWEEN 0 AND 100)
    ),
    CONSTRAINT "ProductionBatch_time_check" CHECK ("completedAt" >= "startedAt")
);

CREATE TABLE "ProductionOutput" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "factoryId" TEXT NOT NULL,
    "batchId" TEXT NOT NULL,
    "itemId" TEXT NOT NULL,
    "stackId" TEXT NOT NULL,
    "quantityKg" DECIMAL(18,3) NOT NULL,
    CONSTRAINT "ProductionOutput_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "ProductionOutput_quantity_check" CHECK ("quantityKg" > 0)
);

CREATE UNIQUE INDEX "ProductionBatch_companyId_batchNumber_key" ON "ProductionBatch"("companyId", "batchNumber");
CREATE UNIQUE INDEX "ProductionBatch_companyId_factoryId_id_key" ON "ProductionBatch"("companyId", "factoryId", "id");
CREATE INDEX "ProductionBatch_companyId_factoryId_status_createdAt_idx" ON "ProductionBatch"("companyId", "factoryId", "status", "createdAt");
CREATE UNIQUE INDEX "ProductionOutput_batchId_itemId_stackId_key" ON "ProductionOutput"("batchId", "itemId", "stackId");
CREATE INDEX "ProductionOutput_companyId_factoryId_itemId_idx" ON "ProductionOutput"("companyId", "factoryId", "itemId");

ALTER TABLE "ProductionBatch" ADD CONSTRAINT "ProductionBatch_companyId_fkey"
FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ProductionBatch" ADD CONSTRAINT "ProductionBatch_companyId_factoryId_fkey"
FOREIGN KEY ("companyId", "factoryId") REFERENCES "Factory"("companyId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ProductionBatch" ADD CONSTRAINT "ProductionBatch_companyId_inputItemId_fkey"
FOREIGN KEY ("companyId", "inputItemId") REFERENCES "Item"("companyId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ProductionBatch" ADD CONSTRAINT "ProductionBatch_companyId_factoryId_inputStackId_fkey"
FOREIGN KEY ("companyId", "factoryId", "inputStackId") REFERENCES "Stack"("companyId", "factoryId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ProductionBatch" ADD CONSTRAINT "ProductionBatch_createdById_fkey"
FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ProductionBatch" ADD CONSTRAINT "ProductionBatch_approvedById_fkey"
FOREIGN KEY ("approvedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ProductionBatch" ADD CONSTRAINT "ProductionBatch_postedById_fkey"
FOREIGN KEY ("postedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "ProductionOutput" ADD CONSTRAINT "ProductionOutput_companyId_factoryId_batchId_fkey"
FOREIGN KEY ("companyId", "factoryId", "batchId") REFERENCES "ProductionBatch"("companyId", "factoryId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ProductionOutput" ADD CONSTRAINT "ProductionOutput_companyId_itemId_fkey"
FOREIGN KEY ("companyId", "itemId") REFERENCES "Item"("companyId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ProductionOutput" ADD CONSTRAINT "ProductionOutput_companyId_factoryId_stackId_fkey"
FOREIGN KEY ("companyId", "factoryId", "stackId") REFERENCES "Stack"("companyId", "factoryId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;
