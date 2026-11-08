CREATE UNIQUE INDEX "GoodsReceipt_companyId_factoryId_id_key"
ON "GoodsReceipt"("companyId", "factoryId", "id");

CREATE TABLE "PurchaseInvoice" (
  "id" TEXT NOT NULL,
  "companyId" TEXT NOT NULL,
  "factoryId" TEXT NOT NULL,
  "goodsReceiptId" TEXT NOT NULL,
  "purchaseOrderId" TEXT NOT NULL,
  "supplierId" TEXT NOT NULL,
  "invoiceNumber" TEXT NOT NULL,
  "invoiceDate" TIMESTAMP(3) NOT NULL,
  "physicalQuantityKg" DECIMAL(18,3) NOT NULL,
  "payableQuantityKg" DECIMAL(18,3) NOT NULL,
  "adjustedUnitRate" DECIMAL(18,4) NOT NULL,
  "grossAmount" DECIMAL(18,2) NOT NULL,
  "qualityDeductionAmount" DECIMAL(18,2) NOT NULL DEFAULT 0,
  "netSupplierPayable" DECIMAL(18,2) NOT NULL,
  "transportCost" DECIMAL(18,2) NOT NULL DEFAULT 0,
  "loadingCost" DECIMAL(18,2) NOT NULL DEFAULT 0,
  "unloadingCost" DECIMAL(18,2) NOT NULL DEFAULT 0,
  "otherCost" DECIMAL(18,2) NOT NULL DEFAULT 0,
  "status" "DocumentStatus" NOT NULL DEFAULT 'DRAFT',
  "remarks" TEXT,
  "createdById" TEXT NOT NULL,
  "approvedById" TEXT,
  "approvedAt" TIMESTAMP(3),
  "postedById" TEXT,
  "postedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "PurchaseInvoice_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "PurchaseInvoice_companyId_invoiceNumber_key"
ON "PurchaseInvoice"("companyId", "invoiceNumber");
CREATE UNIQUE INDEX "PurchaseInvoice_companyId_goodsReceiptId_key"
ON "PurchaseInvoice"("companyId", "goodsReceiptId");
CREATE UNIQUE INDEX "PurchaseInvoice_companyId_factoryId_goodsReceiptId_key"
ON "PurchaseInvoice"("companyId", "factoryId", "goodsReceiptId");
CREATE UNIQUE INDEX "PurchaseInvoice_companyId_factoryId_id_key"
ON "PurchaseInvoice"("companyId", "factoryId", "id");
CREATE INDEX "PurchaseInvoice_companyId_factoryId_status_invoiceDate_idx"
ON "PurchaseInvoice"("companyId", "factoryId", "status", "invoiceDate");
CREATE INDEX "PurchaseInvoice_companyId_supplierId_status_idx"
ON "PurchaseInvoice"("companyId", "supplierId", "status");

ALTER TABLE "PurchaseInvoice"
  ADD CONSTRAINT "PurchaseInvoice_companyId_fkey"
  FOREIGN KEY ("companyId") REFERENCES "Company"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "PurchaseInvoice"
  ADD CONSTRAINT "PurchaseInvoice_companyId_factoryId_fkey"
  FOREIGN KEY ("companyId", "factoryId") REFERENCES "Factory"("companyId", "id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "PurchaseInvoice"
  ADD CONSTRAINT "PurchaseInvoice_companyId_factoryId_goodsReceiptId_fkey"
  FOREIGN KEY ("companyId", "factoryId", "goodsReceiptId") REFERENCES "GoodsReceipt"("companyId", "factoryId", "id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "PurchaseInvoice"
  ADD CONSTRAINT "PurchaseInvoice_companyId_factoryId_purchaseOrderId_fkey"
  FOREIGN KEY ("companyId", "factoryId", "purchaseOrderId") REFERENCES "PurchaseOrder"("companyId", "factoryId", "id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "PurchaseInvoice"
  ADD CONSTRAINT "PurchaseInvoice_companyId_supplierId_fkey"
  FOREIGN KEY ("companyId", "supplierId") REFERENCES "Partner"("companyId", "id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "PurchaseInvoice"
  ADD CONSTRAINT "PurchaseInvoice_createdById_fkey"
  FOREIGN KEY ("createdById") REFERENCES "User"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "PurchaseInvoice"
  ADD CONSTRAINT "PurchaseInvoice_approvedById_fkey"
  FOREIGN KEY ("approvedById") REFERENCES "User"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "PurchaseInvoice"
  ADD CONSTRAINT "PurchaseInvoice_postedById_fkey"
  FOREIGN KEY ("postedById") REFERENCES "User"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;
