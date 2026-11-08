CREATE TYPE "ParboilingStageType" AS ENUM ('SOAKING', 'STEAMING', 'DRYING');

CREATE TABLE "ParboilingBatch" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "factoryId" TEXT NOT NULL,
    "batchNumber" TEXT NOT NULL,
    "inputItemId" TEXT NOT NULL,
    "outputItemId" TEXT NOT NULL,
    "inputStackId" TEXT NOT NULL,
    "outputStackId" TEXT NOT NULL,
    "inputQuantityKg" DECIMAL(18,3) NOT NULL,
    "outputQuantityKg" DECIMAL(18,3) NOT NULL,
    "processLossKg" DECIMAL(18,3) NOT NULL,
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
    CONSTRAINT "ParboilingBatch_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "ParboilingBatch_input_quantity_check" CHECK ("inputQuantityKg" > 0),
    CONSTRAINT "ParboilingBatch_output_quantity_check" CHECK ("outputQuantityKg" > 0 AND "outputQuantityKg" <= "inputQuantityKg"),
    CONSTRAINT "ParboilingBatch_loss_check" CHECK ("processLossKg" = "inputQuantityKg" - "outputQuantityKg"),
    CONSTRAINT "ParboilingBatch_time_check" CHECK ("completedAt" >= "startedAt")
);

CREATE TABLE "ParboilingStage" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "factoryId" TEXT NOT NULL,
    "batchId" TEXT NOT NULL,
    "stageType" "ParboilingStageType" NOT NULL,
    "sequence" INTEGER NOT NULL,
    "startedAt" TIMESTAMP(3) NOT NULL,
    "completedAt" TIMESTAMP(3) NOT NULL,
    "inputQuantityKg" DECIMAL(18,3),
    "outputQuantityKg" DECIMAL(18,3),
    "moistureBeforePct" DECIMAL(5,2) NOT NULL,
    "moistureAfterPct" DECIMAL(5,2) NOT NULL,
    "waterQuantity" DECIMAL(18,3),
    "temperatureC" DECIMAL(7,2),
    "pressureBar" DECIMAL(7,2),
    "fuelQuantity" DECIMAL(18,3),
    "electricityKwh" DECIMAL(18,3),
    "labourCost" DECIMAL(18,2),
    "remarks" TEXT,
    CONSTRAINT "ParboilingStage_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "ParboilingStage_sequence_check" CHECK ("sequence" BETWEEN 1 AND 3),
    CONSTRAINT "ParboilingStage_time_check" CHECK ("completedAt" >= "startedAt"),
    CONSTRAINT "ParboilingStage_weight_check" CHECK (
        ("inputQuantityKg" IS NULL OR "inputQuantityKg" > 0) AND
        ("outputQuantityKg" IS NULL OR "outputQuantityKg" > 0)
    ),
    CONSTRAINT "ParboilingStage_moisture_check" CHECK (
        "moistureBeforePct" BETWEEN 0 AND 100 AND "moistureAfterPct" BETWEEN 0 AND 100 AND
        ("stageType" <> 'DRYING' OR "moistureAfterPct" <= "moistureBeforePct")
    ),
    CONSTRAINT "ParboilingStage_resource_check" CHECK (
        ("waterQuantity" IS NULL OR "waterQuantity" >= 0) AND
        ("temperatureC" IS NULL OR "temperatureC" >= 0) AND
        ("pressureBar" IS NULL OR "pressureBar" >= 0) AND
        ("fuelQuantity" IS NULL OR "fuelQuantity" >= 0) AND
        ("electricityKwh" IS NULL OR "electricityKwh" >= 0) AND
        ("labourCost" IS NULL OR "labourCost" >= 0)
    )
);

CREATE UNIQUE INDEX "ParboilingBatch_companyId_batchNumber_key" ON "ParboilingBatch"("companyId", "batchNumber");
CREATE UNIQUE INDEX "ParboilingBatch_companyId_factoryId_id_key" ON "ParboilingBatch"("companyId", "factoryId", "id");
CREATE INDEX "ParboilingBatch_companyId_factoryId_status_createdAt_idx" ON "ParboilingBatch"("companyId", "factoryId", "status", "createdAt");
CREATE UNIQUE INDEX "ParboilingStage_batchId_stageType_key" ON "ParboilingStage"("batchId", "stageType");
CREATE UNIQUE INDEX "ParboilingStage_batchId_sequence_key" ON "ParboilingStage"("batchId", "sequence");
CREATE INDEX "ParboilingStage_companyId_factoryId_stageType_startedAt_idx" ON "ParboilingStage"("companyId", "factoryId", "stageType", "startedAt");

ALTER TABLE "ParboilingBatch" ADD CONSTRAINT "ParboilingBatch_companyId_fkey"
FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ParboilingBatch" ADD CONSTRAINT "ParboilingBatch_companyId_factoryId_fkey"
FOREIGN KEY ("companyId", "factoryId") REFERENCES "Factory"("companyId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ParboilingBatch" ADD CONSTRAINT "ParboilingBatch_companyId_inputItemId_fkey"
FOREIGN KEY ("companyId", "inputItemId") REFERENCES "Item"("companyId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ParboilingBatch" ADD CONSTRAINT "ParboilingBatch_companyId_outputItemId_fkey"
FOREIGN KEY ("companyId", "outputItemId") REFERENCES "Item"("companyId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ParboilingBatch" ADD CONSTRAINT "ParboilingBatch_companyId_factoryId_inputStackId_fkey"
FOREIGN KEY ("companyId", "factoryId", "inputStackId") REFERENCES "Stack"("companyId", "factoryId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ParboilingBatch" ADD CONSTRAINT "ParboilingBatch_companyId_factoryId_outputStackId_fkey"
FOREIGN KEY ("companyId", "factoryId", "outputStackId") REFERENCES "Stack"("companyId", "factoryId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ParboilingBatch" ADD CONSTRAINT "ParboilingBatch_createdById_fkey"
FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ParboilingBatch" ADD CONSTRAINT "ParboilingBatch_approvedById_fkey"
FOREIGN KEY ("approvedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ParboilingBatch" ADD CONSTRAINT "ParboilingBatch_postedById_fkey"
FOREIGN KEY ("postedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "ParboilingStage" ADD CONSTRAINT "ParboilingStage_companyId_factoryId_batchId_fkey"
FOREIGN KEY ("companyId", "factoryId", "batchId") REFERENCES "ParboilingBatch"("companyId", "factoryId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;
