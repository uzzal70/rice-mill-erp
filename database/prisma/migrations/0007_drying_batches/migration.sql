CREATE TABLE "DryingBatch" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "factoryId" TEXT NOT NULL,
    "batchNumber" TEXT NOT NULL,
    "itemId" TEXT NOT NULL,
    "sourceStackId" TEXT NOT NULL,
    "destinationStackId" TEXT NOT NULL,
    "inputQuantityKg" DECIMAL(18,3) NOT NULL,
    "outputQuantityKg" DECIMAL(18,3) NOT NULL,
    "lossKg" DECIMAL(18,3) NOT NULL,
    "moistureBeforePct" DECIMAL(5,2) NOT NULL,
    "moistureAfterPct" DECIMAL(5,2) NOT NULL,
    "dryingMethod" TEXT NOT NULL,
    "durationMinutes" INTEGER,
    "fuelQuantity" DECIMAL(18,3),
    "electricityKwh" DECIMAL(18,3),
    "labourCost" DECIMAL(18,2),
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
    CONSTRAINT "DryingBatch_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "DryingBatch_input_quantity_check" CHECK ("inputQuantityKg" > 0),
    CONSTRAINT "DryingBatch_output_quantity_check" CHECK ("outputQuantityKg" > 0 AND "outputQuantityKg" <= "inputQuantityKg"),
    CONSTRAINT "DryingBatch_loss_check" CHECK ("lossKg" = "inputQuantityKg" - "outputQuantityKg"),
    CONSTRAINT "DryingBatch_moisture_check" CHECK ("moistureBeforePct" BETWEEN 0 AND 100 AND "moistureAfterPct" BETWEEN 0 AND "moistureBeforePct"),
    CONSTRAINT "DryingBatch_duration_check" CHECK ("durationMinutes" IS NULL OR "durationMinutes" > 0),
    CONSTRAINT "DryingBatch_resource_check" CHECK (
        ("fuelQuantity" IS NULL OR "fuelQuantity" >= 0) AND
        ("electricityKwh" IS NULL OR "electricityKwh" >= 0) AND
        ("labourCost" IS NULL OR "labourCost" >= 0)
    ),
    CONSTRAINT "DryingBatch_time_check" CHECK ("completedAt" >= "startedAt")
);

CREATE UNIQUE INDEX "DryingBatch_companyId_batchNumber_key" ON "DryingBatch"("companyId", "batchNumber");
CREATE UNIQUE INDEX "DryingBatch_companyId_factoryId_id_key" ON "DryingBatch"("companyId", "factoryId", "id");
CREATE INDEX "DryingBatch_companyId_factoryId_status_createdAt_idx" ON "DryingBatch"("companyId", "factoryId", "status", "createdAt");

ALTER TABLE "DryingBatch" ADD CONSTRAINT "DryingBatch_companyId_fkey"
FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "DryingBatch" ADD CONSTRAINT "DryingBatch_companyId_factoryId_fkey"
FOREIGN KEY ("companyId", "factoryId") REFERENCES "Factory"("companyId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "DryingBatch" ADD CONSTRAINT "DryingBatch_companyId_itemId_fkey"
FOREIGN KEY ("companyId", "itemId") REFERENCES "Item"("companyId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "DryingBatch" ADD CONSTRAINT "DryingBatch_companyId_factoryId_sourceStackId_fkey"
FOREIGN KEY ("companyId", "factoryId", "sourceStackId") REFERENCES "Stack"("companyId", "factoryId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "DryingBatch" ADD CONSTRAINT "DryingBatch_companyId_factoryId_destinationStackId_fkey"
FOREIGN KEY ("companyId", "factoryId", "destinationStackId") REFERENCES "Stack"("companyId", "factoryId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "DryingBatch" ADD CONSTRAINT "DryingBatch_createdById_fkey"
FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "DryingBatch" ADD CONSTRAINT "DryingBatch_approvedById_fkey"
FOREIGN KEY ("approvedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "DryingBatch" ADD CONSTRAINT "DryingBatch_postedById_fkey"
FOREIGN KEY ("postedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
