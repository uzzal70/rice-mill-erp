ALTER TABLE "Membership" DROP CONSTRAINT "Membership_factoryId_fkey";
ALTER TABLE "Membership"
ADD CONSTRAINT "Membership_companyId_factoryId_fkey"
FOREIGN KEY ("companyId", "factoryId") REFERENCES "Factory"("companyId", "id")
ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "ProductionLine" DROP CONSTRAINT "ProductionLine_factoryId_fkey";
ALTER TABLE "ProductionLine"
ADD CONSTRAINT "ProductionLine_companyId_factoryId_fkey"
FOREIGN KEY ("companyId", "factoryId") REFERENCES "Factory"("companyId", "id")
ON DELETE RESTRICT ON UPDATE CASCADE;
CREATE INDEX "ProductionLine_companyId_factoryId_idx" ON "ProductionLine"("companyId", "factoryId");

ALTER TABLE "PackagingSpec" ADD COLUMN "companyId" TEXT;
UPDATE "PackagingSpec" AS spec
SET "companyId" = item."companyId"
FROM "Item" AS item
WHERE spec."itemId" = item."id";
ALTER TABLE "PackagingSpec" ALTER COLUMN "companyId" SET NOT NULL;
ALTER TABLE "PackagingSpec" DROP CONSTRAINT "PackagingSpec_itemId_fkey";
ALTER TABLE "PackagingSpec" DROP CONSTRAINT "PackagingSpec_supplierPartnerId_fkey";
CREATE UNIQUE INDEX "PackagingSpec_companyId_itemId_key" ON "PackagingSpec"("companyId", "itemId");
ALTER TABLE "PackagingSpec"
ADD CONSTRAINT "PackagingSpec_companyId_itemId_fkey"
FOREIGN KEY ("companyId", "itemId") REFERENCES "Item"("companyId", "id")
ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PackagingSpec"
ADD CONSTRAINT "PackagingSpec_companyId_supplierPartnerId_fkey"
FOREIGN KEY ("companyId", "supplierPartnerId") REFERENCES "Partner"("companyId", "id")
ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "StockMovement" DROP CONSTRAINT "StockMovement_itemId_fkey";
ALTER TABLE "StockMovement"
ADD CONSTRAINT "StockMovement_companyId_itemId_fkey"
FOREIGN KEY ("companyId", "itemId") REFERENCES "Item"("companyId", "id")
ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "StockMovement" DROP CONSTRAINT "StockMovement_reversalOfId_fkey";
CREATE UNIQUE INDEX "StockMovement_companyId_id_key" ON "StockMovement"("companyId", "id");
ALTER TABLE "StockMovement"
ADD CONSTRAINT "StockMovement_companyId_reversalOfId_fkey"
FOREIGN KEY ("companyId", "reversalOfId") REFERENCES "StockMovement"("companyId", "id")
ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "Journal" DROP CONSTRAINT "Journal_reversalOfId_fkey";
CREATE UNIQUE INDEX "Journal_companyId_id_key" ON "Journal"("companyId", "id");
ALTER TABLE "Journal"
ADD CONSTRAINT "Journal_companyId_reversalOfId_fkey"
FOREIGN KEY ("companyId", "reversalOfId") REFERENCES "Journal"("companyId", "id")
ON DELETE RESTRICT ON UPDATE CASCADE;
