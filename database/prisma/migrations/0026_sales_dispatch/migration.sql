-- AlterTable
ALTER TABLE "SalesOrderLine" ADD CONSTRAINT "SalesOrderLine_companyId_factoryId_id_key" UNIQUE ("companyId", "factoryId", "id");

-- CreateTable
CREATE TABLE "Dispatch" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "factoryId" TEXT NOT NULL,
    "salesOrderId" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "challanNumber" TEXT NOT NULL,
    "gatePassNumber" TEXT NOT NULL,
    "status" "DocumentStatus" NOT NULL DEFAULT 'DRAFT',
    "dispatchDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "vehicleNumber" TEXT NOT NULL,
    "driverName" TEXT NOT NULL,
    "driverMobile" TEXT,
    "totalBags" INTEGER NOT NULL DEFAULT 0,
    "totalWeightKg" DECIMAL(18,3) NOT NULL DEFAULT 0,
    "remarks" TEXT,
    "createdById" TEXT NOT NULL,
    "approvedById" TEXT,
    "approvedAt" TIMESTAMP(3),
    "postedById" TEXT,
    "postedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Dispatch_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DispatchLine" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "factoryId" TEXT NOT NULL,
    "dispatchId" TEXT NOT NULL,
    "salesOrderLineId" TEXT NOT NULL,
    "itemId" TEXT NOT NULL,
    "stackId" TEXT NOT NULL,
    "packagingItemId" TEXT,
    "bagCount" INTEGER NOT NULL DEFAULT 0,
    "grossWeightKg" DECIMAL(18,3),
    "tareWeightKg" DECIMAL(18,3),
    "netWeightKg" DECIMAL(18,3) NOT NULL,
    "unitRate" DECIMAL(18,4) NOT NULL,
    "lineAmount" DECIMAL(18,2) NOT NULL,

    CONSTRAINT "DispatchLine_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Dispatch_companyId_challanNumber_key" ON "Dispatch"("companyId", "challanNumber");
CREATE UNIQUE INDEX "Dispatch_companyId_gatePassNumber_key" ON "Dispatch"("companyId", "gatePassNumber");
CREATE UNIQUE INDEX "Dispatch_companyId_factoryId_id_key" ON "Dispatch"("companyId", "factoryId", "id");
CREATE INDEX "Dispatch_companyId_factoryId_status_createdAt_idx" ON "Dispatch"("companyId", "factoryId", "status", "createdAt");
CREATE INDEX "Dispatch_companyId_customerId_createdAt_idx" ON "Dispatch"("companyId", "customerId", "createdAt");
CREATE INDEX "Dispatch_companyId_salesOrderId_idx" ON "Dispatch"("companyId", "salesOrderId");

-- CreateIndex
CREATE INDEX "DispatchLine_companyId_factoryId_itemId_stackId_idx" ON "DispatchLine"("companyId", "factoryId", "itemId", "stackId");

-- AddForeignKey
ALTER TABLE "Dispatch" ADD CONSTRAINT "Dispatch_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Dispatch" ADD CONSTRAINT "Dispatch_companyId_factoryId_fkey" FOREIGN KEY ("companyId", "factoryId") REFERENCES "Factory"("companyId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Dispatch" ADD CONSTRAINT "Dispatch_companyId_factoryId_salesOrderId_fkey" FOREIGN KEY ("companyId", "factoryId", "salesOrderId") REFERENCES "SalesOrder"("companyId", "factoryId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Dispatch" ADD CONSTRAINT "Dispatch_companyId_customerId_fkey" FOREIGN KEY ("companyId", "customerId") REFERENCES "Partner"("companyId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DispatchLine" ADD CONSTRAINT "DispatchLine_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "DispatchLine" ADD CONSTRAINT "DispatchLine_companyId_factoryId_fkey" FOREIGN KEY ("companyId", "factoryId") REFERENCES "Factory"("companyId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "DispatchLine" ADD CONSTRAINT "DispatchLine_companyId_factoryId_dispatchId_fkey" FOREIGN KEY ("companyId", "factoryId", "dispatchId") REFERENCES "Dispatch"("companyId", "factoryId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "DispatchLine" ADD CONSTRAINT "DispatchLine_companyId_factoryId_salesOrderLineId_fkey" FOREIGN KEY ("companyId", "factoryId", "salesOrderLineId") REFERENCES "SalesOrderLine"("companyId", "factoryId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "DispatchLine" ADD CONSTRAINT "DispatchLine_companyId_itemId_fkey" FOREIGN KEY ("companyId", "itemId") REFERENCES "Item"("companyId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "DispatchLine" ADD CONSTRAINT "DispatchLine_companyId_packagingItemId_fkey" FOREIGN KEY ("companyId", "packagingItemId") REFERENCES "Item"("companyId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "DispatchLine" ADD CONSTRAINT "DispatchLine_companyId_factoryId_stackId_fkey" FOREIGN KEY ("companyId", "factoryId", "stackId") REFERENCES "Stack"("companyId", "factoryId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

