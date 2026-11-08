ALTER TABLE "ProductionLine"
ADD CONSTRAINT "ProductionLine_companyId_factoryId_id_key"
UNIQUE ("companyId", "factoryId", "id");

ALTER TABLE "ProductionBatch"
ADD COLUMN "productionLineId" TEXT;

CREATE INDEX "ProductionBatch_companyId_factoryId_productionLineId_idx"
ON "ProductionBatch"("companyId", "factoryId", "productionLineId");

ALTER TABLE "ProductionBatch"
ADD CONSTRAINT "ProductionBatch_companyId_factoryId_productionLineId_fkey"
FOREIGN KEY ("companyId", "factoryId", "productionLineId")
REFERENCES "ProductionLine"("companyId", "factoryId", "id")
ON DELETE RESTRICT ON UPDATE CASCADE;
