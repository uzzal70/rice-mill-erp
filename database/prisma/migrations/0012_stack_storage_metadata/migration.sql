ALTER TABLE "Stack"
ADD COLUMN "materialItemId" TEXT,
ADD COLUMN "varietyName" TEXT,
ADD COLUMN "cropYear" INTEGER,
ADD COLUMN "batchNumber" TEXT,
ADD COLUMN "lotNumber" TEXT,
ADD COLUMN "receivedAt" TIMESTAMP(3);

CREATE INDEX "Stack_companyId_factoryId_receivedAt_idx"
ON "Stack"("companyId", "factoryId", "receivedAt");

CREATE INDEX "Stack_materialItemId_idx"
ON "Stack"("materialItemId");

ALTER TABLE "Stack"
ADD CONSTRAINT "Stack_companyId_materialItemId_fkey"
FOREIGN KEY ("companyId", "materialItemId")
REFERENCES "Item"("companyId", "id")
ON DELETE RESTRICT ON UPDATE CASCADE;
