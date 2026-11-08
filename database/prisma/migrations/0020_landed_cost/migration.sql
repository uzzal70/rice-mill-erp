CREATE TYPE "LandedCostComponentType" AS ENUM ('TRANSPORT', 'LOADING', 'UNLOADING', 'COMMISSION', 'DRYING', 'OTHER_DIRECT');

CREATE TABLE "landed_cost_component_configs" (
  "id" TEXT NOT NULL,
  "companyId" TEXT NOT NULL,
  "factoryId" TEXT,
  "name" TEXT NOT NULL,
  "code" TEXT NOT NULL,
  "type" "LandedCostComponentType" NOT NULL,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "isRequired" BOOLEAN NOT NULL DEFAULT false,
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "landed_cost_component_configs_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "landed_cost_component_configs_companyId_code_key" ON "landed_cost_component_configs"("companyId", "code");
CREATE INDEX "landed_cost_component_configs_companyId_factoryId_isActive_idx" ON "landed_cost_component_configs"("companyId", "factoryId", "isActive");
ALTER TABLE "landed_cost_component_configs" ADD CONSTRAINT "landed_cost_component_configs_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "landed_cost_component_configs" ADD CONSTRAINT "landed_cost_component_configs_companyId_factoryId_fkey" FOREIGN KEY ("companyId", "factoryId") REFERENCES "Factory"("companyId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TABLE "landed_costs" (
  "id" TEXT NOT NULL,
  "companyId" TEXT NOT NULL,
  "factoryId" TEXT NOT NULL,
  "goodsReceiptId" TEXT NOT NULL,
  "purchaseOrderId" TEXT NOT NULL,
  "purchaseInvoiceId" TEXT,
  "quantityKg" DECIMAL(18,3) NOT NULL,
  "purchaseCost" DECIMAL(18,2) NOT NULL,
  "transportCost" DECIMAL(18,2) NOT NULL DEFAULT 0,
  "loadingCost" DECIMAL(18,2) NOT NULL DEFAULT 0,
  "unloadingCost" DECIMAL(18,2) NOT NULL DEFAULT 0,
  "commissionCost" DECIMAL(18,2) NOT NULL DEFAULT 0,
  "dryingCost" DECIMAL(18,2) NOT NULL DEFAULT 0,
  "otherDirectCost" DECIMAL(18,2) NOT NULL DEFAULT 0,
  "totalAdditionalCost" DECIMAL(18,2) NOT NULL,
  "landedCostTotal" DECIMAL(18,2) NOT NULL,
  "landedCostPerKg" DECIMAL(18,4) NOT NULL,
  "landedCostPerMon" DECIMAL(18,4) NOT NULL,
  "landedCostPerTon" DECIMAL(18,4) NOT NULL,
  "components" JSONB,
  "calculatedById" TEXT NOT NULL,
  "calculatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "status" "DocumentStatus" NOT NULL DEFAULT 'DRAFT',
  "approvedById" TEXT,
  "approvedAt" TIMESTAMP(3),
  "postedById" TEXT,
  "postedAt" TIMESTAMP(3),
  "updatedAt" TIMESTAMP(3) NOT NULL,
  "remarks" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "landed_costs_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "landed_costs_goodsReceiptId_key" ON "landed_costs"("goodsReceiptId");
CREATE UNIQUE INDEX "landed_costs_companyId_factoryId_id_key" ON "landed_costs"("companyId", "factoryId", "id");
CREATE UNIQUE INDEX "landed_costs_companyId_factoryId_goodsReceiptId_key" ON "landed_costs"("companyId", "factoryId", "goodsReceiptId");
CREATE INDEX "landed_costs_companyId_factoryId_status_calculatedAt_idx" ON "landed_costs"("companyId", "factoryId", "status", "calculatedAt");
ALTER TABLE "landed_costs" ADD CONSTRAINT "landed_costs_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "landed_costs" ADD CONSTRAINT "landed_costs_companyId_factoryId_fkey" FOREIGN KEY ("companyId", "factoryId") REFERENCES "Factory"("companyId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "landed_costs" ADD CONSTRAINT "landed_costs_companyId_factoryId_goodsReceiptId_fkey" FOREIGN KEY ("companyId", "factoryId", "goodsReceiptId") REFERENCES "GoodsReceipt"("companyId", "factoryId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "landed_costs" ADD CONSTRAINT "landed_costs_companyId_factoryId_purchaseOrderId_fkey" FOREIGN KEY ("companyId", "factoryId", "purchaseOrderId") REFERENCES "PurchaseOrder"("companyId", "factoryId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "landed_costs" ADD CONSTRAINT "landed_costs_companyId_factoryId_purchaseInvoiceId_fkey" FOREIGN KEY ("companyId", "factoryId", "purchaseInvoiceId") REFERENCES "PurchaseInvoice"("companyId", "factoryId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "landed_costs" ADD CONSTRAINT "landed_costs_calculatedById_fkey" FOREIGN KEY ("calculatedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "landed_costs" ADD CONSTRAINT "landed_costs_approvedById_fkey" FOREIGN KEY ("approvedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "landed_costs" ADD CONSTRAINT "landed_costs_postedById_fkey" FOREIGN KEY ("postedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
