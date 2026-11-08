ALTER TABLE "PurchaseOrder"
  ADD COLUMN "brokerId" TEXT,
  ADD COLUMN "brokerCommissionType" "BrokerCommissionType",
  ADD COLUMN "brokerCommissionRate" DECIMAL(18,4),
  ADD COLUMN "brokerCommissionAmount" DECIMAL(18,2);

ALTER TABLE "PurchaseOrder"
  ADD CONSTRAINT "PurchaseOrder_companyId_brokerId_fkey"
  FOREIGN KEY ("companyId", "brokerId")
  REFERENCES "Partner"("companyId", "id")
  ON DELETE RESTRICT
  ON UPDATE CASCADE;

CREATE INDEX "PurchaseOrder_companyId_brokerId_idx"
  ON "PurchaseOrder"("companyId", "brokerId");
