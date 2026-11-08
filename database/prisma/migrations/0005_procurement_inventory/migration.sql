ALTER TABLE "Godown" DROP CONSTRAINT "Godown_factoryId_fkey";
CREATE UNIQUE INDEX "Godown_companyId_factoryId_id_key" ON "Godown"("companyId", "factoryId", "id");
ALTER TABLE "Godown" ADD CONSTRAINT "Godown_companyId_factoryId_fkey"
FOREIGN KEY ("companyId", "factoryId") REFERENCES "Factory"("companyId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "Stack" ADD COLUMN "companyId" TEXT;
ALTER TABLE "Stack" ADD COLUMN "factoryId" TEXT;
UPDATE "Stack" AS s
SET "companyId" = g."companyId", "factoryId" = g."factoryId"
FROM "Godown" AS g
WHERE s."godownId" = g."id";
ALTER TABLE "Stack" ALTER COLUMN "companyId" SET NOT NULL;
ALTER TABLE "Stack" ALTER COLUMN "factoryId" SET NOT NULL;
ALTER TABLE "Stack" DROP CONSTRAINT "Stack_godownId_fkey";
CREATE UNIQUE INDEX "Stack_companyId_factoryId_id_key" ON "Stack"("companyId", "factoryId", "id");
CREATE UNIQUE INDEX "Stack_companyId_factoryId_godownId_id_key" ON "Stack"("companyId", "factoryId", "godownId", "id");
CREATE INDEX "Stack_companyId_factoryId_idx" ON "Stack"("companyId", "factoryId");
ALTER TABLE "Stack" ADD CONSTRAINT "Stack_companyId_factoryId_godownId_fkey"
FOREIGN KEY ("companyId", "factoryId", "godownId") REFERENCES "Godown"("companyId", "factoryId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "StockMovement" DROP CONSTRAINT "StockMovement_factoryId_fkey";
ALTER TABLE "StockMovement" ADD CONSTRAINT "StockMovement_companyId_factoryId_fkey"
FOREIGN KEY ("companyId", "factoryId") REFERENCES "Factory"("companyId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "StockMovement" ADD CONSTRAINT "StockMovement_companyId_factoryId_stackId_fkey"
FOREIGN KEY ("companyId", "factoryId", "stackId") REFERENCES "Stack"("companyId", "factoryId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;
CREATE UNIQUE INDEX "StockMovement_sourceType_sourceId_type_stackId_key"
ON "StockMovement"("sourceType", "sourceId", "type", "stackId");
ALTER TABLE "StockMovement" ADD CONSTRAINT "StockMovement_quantity_nonzero_check" CHECK ("quantity" <> 0);

CREATE TABLE "StockTransfer" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "factoryId" TEXT NOT NULL,
    "transferNumber" TEXT NOT NULL,
    "itemId" TEXT NOT NULL,
    "sourceStackId" TEXT NOT NULL,
    "destinationStackId" TEXT NOT NULL,
    "quantity" DECIMAL(18,3) NOT NULL,
    "reason" TEXT,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "StockTransfer_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "StockTransfer_quantity_check" CHECK ("quantity" > 0),
    CONSTRAINT "StockTransfer_distinct_stacks_check" CHECK ("sourceStackId" <> "destinationStackId")
);
CREATE TABLE "StockAdjustment" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "factoryId" TEXT NOT NULL,
    "adjustmentNumber" TEXT NOT NULL,
    "itemId" TEXT NOT NULL,
    "stackId" TEXT NOT NULL,
    "quantity" DECIMAL(18,3) NOT NULL,
    "reason" TEXT NOT NULL,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "StockAdjustment_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "StockAdjustment_quantity_check" CHECK ("quantity" <> 0)
);
CREATE TABLE "PurchaseOrder" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "factoryId" TEXT NOT NULL,
    "orderNumber" TEXT NOT NULL,
    "gateEntryId" TEXT NOT NULL,
    "supplierId" TEXT NOT NULL,
    "itemId" TEXT NOT NULL,
    "destinationGodownId" TEXT NOT NULL,
    "destinationStackId" TEXT NOT NULL,
    "orderedQuantity" DECIMAL(18,3) NOT NULL,
    "unit" "UnitOfMeasure" NOT NULL DEFAULT 'KG',
    "unitRate" DECIMAL(18,4) NOT NULL,
    "status" "DocumentStatus" NOT NULL DEFAULT 'DRAFT',
    "remarks" TEXT,
    "createdById" TEXT NOT NULL,
    "approvedById" TEXT,
    "approvedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "PurchaseOrder_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "PurchaseOrder_quantity_check" CHECK ("orderedQuantity" > 0),
    CONSTRAINT "PurchaseOrder_rate_check" CHECK ("unitRate" > 0)
);
CREATE TABLE "GoodsReceipt" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "factoryId" TEXT NOT NULL,
    "receiptNumber" TEXT NOT NULL,
    "purchaseOrderId" TEXT NOT NULL,
    "destinationGodownId" TEXT NOT NULL,
    "destinationStackId" TEXT NOT NULL,
    "quantity" DECIMAL(18,3) NOT NULL,
    "unit" "UnitOfMeasure" NOT NULL DEFAULT 'KG',
    "status" "DocumentStatus" NOT NULL DEFAULT 'DRAFT',
    "remarks" TEXT,
    "createdById" TEXT NOT NULL,
    "approvedById" TEXT,
    "approvedAt" TIMESTAMP(3),
    "postedById" TEXT,
    "postedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "GoodsReceipt_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "GoodsReceipt_quantity_check" CHECK ("quantity" > 0)
);

CREATE UNIQUE INDEX "StockTransfer_companyId_transferNumber_key" ON "StockTransfer"("companyId", "transferNumber");
CREATE INDEX "StockTransfer_companyId_factoryId_itemId_createdAt_idx" ON "StockTransfer"("companyId", "factoryId", "itemId", "createdAt");
CREATE UNIQUE INDEX "StockAdjustment_companyId_adjustmentNumber_key" ON "StockAdjustment"("companyId", "adjustmentNumber");
CREATE INDEX "StockAdjustment_companyId_factoryId_itemId_createdAt_idx" ON "StockAdjustment"("companyId", "factoryId", "itemId", "createdAt");
CREATE UNIQUE INDEX "PurchaseOrder_companyId_orderNumber_key" ON "PurchaseOrder"("companyId", "orderNumber");
CREATE UNIQUE INDEX "PurchaseOrder_companyId_factoryId_id_key" ON "PurchaseOrder"("companyId", "factoryId", "id");
CREATE UNIQUE INDEX "PurchaseOrder_companyId_factoryId_gateEntryId_key" ON "PurchaseOrder"("companyId", "factoryId", "gateEntryId");
CREATE INDEX "PurchaseOrder_companyId_factoryId_status_createdAt_idx" ON "PurchaseOrder"("companyId", "factoryId", "status", "createdAt");
CREATE UNIQUE INDEX "GoodsReceipt_companyId_receiptNumber_key" ON "GoodsReceipt"("companyId", "receiptNumber");
CREATE UNIQUE INDEX "GoodsReceipt_companyId_id_key" ON "GoodsReceipt"("companyId", "id");
CREATE INDEX "GoodsReceipt_companyId_factoryId_purchaseOrderId_status_idx" ON "GoodsReceipt"("companyId", "factoryId", "purchaseOrderId", "status");

ALTER TABLE "StockTransfer" ADD CONSTRAINT "StockTransfer_companyId_fkey"
FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "StockTransfer" ADD CONSTRAINT "StockTransfer_companyId_factoryId_fkey"
FOREIGN KEY ("companyId", "factoryId") REFERENCES "Factory"("companyId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "StockTransfer" ADD CONSTRAINT "StockTransfer_companyId_itemId_fkey"
FOREIGN KEY ("companyId", "itemId") REFERENCES "Item"("companyId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "StockTransfer" ADD CONSTRAINT "StockTransfer_companyId_factoryId_sourceStackId_fkey"
FOREIGN KEY ("companyId", "factoryId", "sourceStackId") REFERENCES "Stack"("companyId", "factoryId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "StockTransfer" ADD CONSTRAINT "StockTransfer_companyId_factoryId_destinationStackId_fkey"
FOREIGN KEY ("companyId", "factoryId", "destinationStackId") REFERENCES "Stack"("companyId", "factoryId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "StockTransfer" ADD CONSTRAINT "StockTransfer_createdById_fkey"
FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "StockAdjustment" ADD CONSTRAINT "StockAdjustment_companyId_fkey"
FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "StockAdjustment" ADD CONSTRAINT "StockAdjustment_companyId_factoryId_fkey"
FOREIGN KEY ("companyId", "factoryId") REFERENCES "Factory"("companyId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "StockAdjustment" ADD CONSTRAINT "StockAdjustment_companyId_itemId_fkey"
FOREIGN KEY ("companyId", "itemId") REFERENCES "Item"("companyId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "StockAdjustment" ADD CONSTRAINT "StockAdjustment_companyId_factoryId_stackId_fkey"
FOREIGN KEY ("companyId", "factoryId", "stackId") REFERENCES "Stack"("companyId", "factoryId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "StockAdjustment" ADD CONSTRAINT "StockAdjustment_createdById_fkey"
FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "PurchaseOrder" ADD CONSTRAINT "PurchaseOrder_companyId_fkey"
FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "PurchaseOrder" ADD CONSTRAINT "PurchaseOrder_companyId_factoryId_fkey"
FOREIGN KEY ("companyId", "factoryId") REFERENCES "Factory"("companyId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "PurchaseOrder" ADD CONSTRAINT "PurchaseOrder_companyId_factoryId_gateEntryId_fkey"
FOREIGN KEY ("companyId", "factoryId", "gateEntryId") REFERENCES "GateEntry"("companyId", "factoryId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "PurchaseOrder" ADD CONSTRAINT "PurchaseOrder_companyId_supplierId_fkey"
FOREIGN KEY ("companyId", "supplierId") REFERENCES "Partner"("companyId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "PurchaseOrder" ADD CONSTRAINT "PurchaseOrder_companyId_itemId_fkey"
FOREIGN KEY ("companyId", "itemId") REFERENCES "Item"("companyId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "PurchaseOrder" ADD CONSTRAINT "PurchaseOrder_companyId_factoryId_destinationGodownId_fkey"
FOREIGN KEY ("companyId", "factoryId", "destinationGodownId") REFERENCES "Godown"("companyId", "factoryId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "PurchaseOrder" ADD CONSTRAINT "PurchaseOrder_companyId_factoryId_destinationStackId_fkey"
FOREIGN KEY ("companyId", "factoryId", "destinationGodownId", "destinationStackId") REFERENCES "Stack"("companyId", "factoryId", "godownId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "PurchaseOrder" ADD CONSTRAINT "PurchaseOrder_createdById_fkey"
FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "PurchaseOrder" ADD CONSTRAINT "PurchaseOrder_approvedById_fkey"
FOREIGN KEY ("approvedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "GoodsReceipt" ADD CONSTRAINT "GoodsReceipt_companyId_fkey"
FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "GoodsReceipt" ADD CONSTRAINT "GoodsReceipt_companyId_factoryId_fkey"
FOREIGN KEY ("companyId", "factoryId") REFERENCES "Factory"("companyId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "GoodsReceipt" ADD CONSTRAINT "GoodsReceipt_companyId_factoryId_purchaseOrderId_fkey"
FOREIGN KEY ("companyId", "factoryId", "purchaseOrderId") REFERENCES "PurchaseOrder"("companyId", "factoryId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "GoodsReceipt" ADD CONSTRAINT "GoodsReceipt_companyId_factoryId_destinationGodownId_fkey"
FOREIGN KEY ("companyId", "factoryId", "destinationGodownId") REFERENCES "Godown"("companyId", "factoryId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "GoodsReceipt" ADD CONSTRAINT "GoodsReceipt_companyId_factoryId_destinationStackId_fkey"
FOREIGN KEY ("companyId", "factoryId", "destinationGodownId", "destinationStackId") REFERENCES "Stack"("companyId", "factoryId", "godownId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "GoodsReceipt" ADD CONSTRAINT "GoodsReceipt_createdById_fkey"
FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "GoodsReceipt" ADD CONSTRAINT "GoodsReceipt_approvedById_fkey"
FOREIGN KEY ("approvedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "GoodsReceipt" ADD CONSTRAINT "GoodsReceipt_postedById_fkey"
FOREIGN KEY ("postedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
