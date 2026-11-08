CREATE TABLE "SalesOrder" (
  "id" TEXT NOT NULL,
  "companyId" TEXT NOT NULL,
  "factoryId" TEXT NOT NULL,
  "customerId" TEXT NOT NULL,
  "orderNumber" TEXT NOT NULL,
  "channel" TEXT NOT NULL,
  "status" "DocumentStatus" NOT NULL DEFAULT 'DRAFT',
  "requestedDelivery" TIMESTAMP(3),
  "currency" TEXT NOT NULL DEFAULT 'BDT',
  "totalAmount" DECIMAL(18,2) NOT NULL DEFAULT 0,
  "remarks" TEXT,
  "createdById" TEXT NOT NULL,
  "approvedById" TEXT,
  "approvedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "SalesOrder_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "SalesOrderLine" (
  "id" TEXT NOT NULL,
  "companyId" TEXT NOT NULL,
  "factoryId" TEXT NOT NULL,
  "salesOrderId" TEXT NOT NULL,
  "itemId" TEXT NOT NULL,
  "stackId" TEXT NOT NULL,
  "quantityKg" DECIMAL(18,3) NOT NULL,
  "unitRate" DECIMAL(18,4) NOT NULL,
  "lineAmount" DECIMAL(18,2) NOT NULL,
  "reservedAt" TIMESTAMP(3),
  "fulfilledKg" DECIMAL(18,3) NOT NULL DEFAULT 0,
  CONSTRAINT "SalesOrderLine_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "SalesOrder_companyId_orderNumber_key" ON "SalesOrder"("companyId", "orderNumber");
CREATE UNIQUE INDEX "SalesOrder_companyId_factoryId_id_key" ON "SalesOrder"("companyId", "factoryId", "id");
CREATE INDEX "SalesOrder_companyId_factoryId_status_createdAt_idx" ON "SalesOrder"("companyId", "factoryId", "status", "createdAt");
CREATE INDEX "SalesOrder_companyId_customerId_createdAt_idx" ON "SalesOrder"("companyId", "customerId", "createdAt");
CREATE INDEX "SalesOrderLine_companyId_factoryId_itemId_stackId_reservedAt_idx" ON "SalesOrderLine"("companyId", "factoryId", "itemId", "stackId", "reservedAt");
ALTER TABLE "SalesOrder" ADD CONSTRAINT "SalesOrder_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "SalesOrder" ADD CONSTRAINT "SalesOrder_companyId_factoryId_fkey" FOREIGN KEY ("companyId", "factoryId") REFERENCES "Factory"("companyId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "SalesOrder" ADD CONSTRAINT "SalesOrder_companyId_customerId_fkey" FOREIGN KEY ("companyId", "customerId") REFERENCES "Partner"("companyId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "SalesOrderLine" ADD CONSTRAINT "SalesOrderLine_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "SalesOrderLine" ADD CONSTRAINT "SalesOrderLine_companyId_factoryId_fkey" FOREIGN KEY ("companyId", "factoryId") REFERENCES "Factory"("companyId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "SalesOrderLine" ADD CONSTRAINT "SalesOrderLine_companyId_factoryId_salesOrderId_fkey" FOREIGN KEY ("companyId", "factoryId", "salesOrderId") REFERENCES "SalesOrder"("companyId", "factoryId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "SalesOrderLine" ADD CONSTRAINT "SalesOrderLine_companyId_itemId_fkey" FOREIGN KEY ("companyId", "itemId") REFERENCES "Item"("companyId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "SalesOrderLine" ADD CONSTRAINT "SalesOrderLine_companyId_factoryId_stackId_fkey" FOREIGN KEY ("companyId", "factoryId", "stackId") REFERENCES "Stack"("companyId", "factoryId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;
