ALTER TABLE "Item" ADD COLUMN "byProductType" TEXT;

CREATE INDEX "Item_companyId_kind_byProductType_idx"
ON "Item"("companyId", "kind", "byProductType");
