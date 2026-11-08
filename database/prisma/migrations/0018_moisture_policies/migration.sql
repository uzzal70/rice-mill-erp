CREATE TYPE "MoistureDeductionFormula" AS ENUM ('DRY_MATTER_CORRECTION', 'SLAB_PERCENTAGE');

CREATE TABLE "MoisturePolicy" (
  "id" TEXT NOT NULL,
  "companyId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "factoryId" TEXT,
  "paddyItemId" TEXT,
  "supplierPartnerId" TEXT,
  "active" BOOLEAN NOT NULL DEFAULT true,
  "priority" INTEGER NOT NULL DEFAULT 0,
  "allowedMoisturePct" DECIMAL(7,3) NOT NULL,
  "tolerancePct" DECIMAL(7,3) NOT NULL DEFAULT 0,
  "formula" "MoistureDeductionFormula" NOT NULL,
  "rateDeductionPct" DECIMAL(7,4) NOT NULL DEFAULT 0,
  "slabs" JSONB NOT NULL DEFAULT '[]',
  "createdById" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "MoisturePolicy_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "MoisturePolicy_companyId_id_key" ON "MoisturePolicy"("companyId", "id");
CREATE INDEX "MoisturePolicy_companyId_active_priority_idx" ON "MoisturePolicy"("companyId", "active", "priority");
CREATE INDEX "MoisturePolicy_companyId_factoryId_active_priority_idx" ON "MoisturePolicy"("companyId", "factoryId", "active", "priority");
CREATE INDEX "MoisturePolicy_companyId_paddyItemId_supplierPartnerId_idx" ON "MoisturePolicy"("companyId", "paddyItemId", "supplierPartnerId");

ALTER TABLE "MoisturePolicy"
  ADD CONSTRAINT "MoisturePolicy_companyId_fkey"
  FOREIGN KEY ("companyId") REFERENCES "Company"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "MoisturePolicy"
  ADD CONSTRAINT "MoisturePolicy_companyId_factoryId_fkey"
  FOREIGN KEY ("companyId", "factoryId") REFERENCES "Factory"("companyId", "id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "MoisturePolicy"
  ADD CONSTRAINT "MoisturePolicy_companyId_paddyItemId_fkey"
  FOREIGN KEY ("companyId", "paddyItemId") REFERENCES "Item"("companyId", "id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "MoisturePolicy"
  ADD CONSTRAINT "MoisturePolicy_companyId_supplierPartnerId_fkey"
  FOREIGN KEY ("companyId", "supplierPartnerId") REFERENCES "Partner"("companyId", "id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "MoisturePolicy"
  ADD CONSTRAINT "MoisturePolicy_createdById_fkey"
  FOREIGN KEY ("createdById") REFERENCES "User"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE UNIQUE INDEX "QualitySample_companyId_factoryId_id_key" ON "QualitySample"("companyId", "factoryId", "id");

ALTER TABLE "PurchaseOrder"
  ADD COLUMN "payableQuantityKg" DECIMAL(18,3),
  ADD COLUMN "adjustedUnitRate" DECIMAL(18,4),
  ADD COLUMN "qualitySampleId" TEXT,
  ADD COLUMN "moisturePolicyId" TEXT,
  ADD COLUMN "moisturePolicyName" TEXT,
  ADD COLUMN "moistureReceivedPct" DECIMAL(7,3),
  ADD COLUMN "moistureAllowedPct" DECIMAL(7,3),
  ADD COLUMN "moistureTolerancePct" DECIMAL(7,3),
  ADD COLUMN "moistureDifferencePct" DECIMAL(7,3),
  ADD COLUMN "moistureDeductionFormula" "MoistureDeductionFormula",
  ADD COLUMN "moistureDeductionPct" DECIMAL(7,4),
  ADD COLUMN "moistureDeductionQuantityKg" DECIMAL(18,3),
  ADD COLUMN "moistureRateDeductionPct" DECIMAL(7,4);

UPDATE "PurchaseOrder"
SET "payableQuantityKg" = "orderedQuantity",
    "adjustedUnitRate" = "unitRate";

ALTER TABLE "PurchaseOrder"
  ALTER COLUMN "payableQuantityKg" SET NOT NULL,
  ALTER COLUMN "adjustedUnitRate" SET NOT NULL;

CREATE INDEX "PurchaseOrder_companyId_moisturePolicyId_idx" ON "PurchaseOrder"("companyId", "moisturePolicyId");

ALTER TABLE "PurchaseOrder"
  ADD CONSTRAINT "PurchaseOrder_companyId_moisturePolicyId_fkey"
  FOREIGN KEY ("companyId", "moisturePolicyId") REFERENCES "MoisturePolicy"("companyId", "id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "PurchaseOrder"
  ADD CONSTRAINT "PurchaseOrder_companyId_factoryId_qualitySampleId_fkey"
  FOREIGN KEY ("companyId", "factoryId", "qualitySampleId") REFERENCES "QualitySample"("companyId", "factoryId", "id")
  ON DELETE RESTRICT ON UPDATE CASCADE;
