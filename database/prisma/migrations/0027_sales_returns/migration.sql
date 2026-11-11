-- CreateEnum
CREATE TYPE "SalesReturnType" AS ENUM ('FULL', 'PARTIAL', 'DAMAGED');
CREATE TYPE "SalesReturnCondition" AS ENUM ('INTACT', 'DAMAGED');
CREATE TYPE "SalesReturnSettlement" AS ENUM ('CREDIT_NOTE', 'REPLACEMENT', 'REFUND');

-- AlterTable
ALTER TABLE "DispatchLine" ADD CONSTRAINT "DispatchLine_companyId_factoryId_id_key" UNIQUE ("companyId", "factoryId", "id");

-- CreateTable
CREATE TABLE "SalesReturn" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "factoryId" TEXT NOT NULL,
    "dispatchId" TEXT,
    "salesOrderId" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "returnNumber" TEXT NOT NULL,
    "creditNoteNumber" TEXT,
    "type" "SalesReturnType" NOT NULL DEFAULT 'PARTIAL',
    "settlement" "SalesReturnSettlement" NOT NULL DEFAULT 'CREDIT_NOTE',
    "status" "DocumentStatus" NOT NULL DEFAULT 'DRAFT',
    "returnDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reason" TEXT NOT NULL,
    "totalBags" INTEGER NOT NULL DEFAULT 0,
    "totalWeightKg" DECIMAL(18,3) NOT NULL DEFAULT 0,
    "totalAmount" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "remarks" TEXT,
    "createdById" TEXT NOT NULL,
    "approvedById" TEXT,
    "approvedAt" TIMESTAMP(3),
    "postedById" TEXT,
    "postedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SalesReturn_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SalesReturnLine" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "factoryId" TEXT NOT NULL,
    "salesReturnId" TEXT NOT NULL,
    "salesOrderLineId" TEXT NOT NULL,
    "dispatchLineId" TEXT,
    "itemId" TEXT NOT NULL,
    "restockStackId" TEXT NOT NULL,
    "condition" "SalesReturnCondition" NOT NULL DEFAULT 'INTACT',
    "bagCount" INTEGER NOT NULL DEFAULT 0,
    "returnKg" DECIMAL(18,3) NOT NULL,
    "unitRate" DECIMAL(18,4) NOT NULL,
    "lineAmount" DECIMAL(18,2) NOT NULL,
    "damageNotes" TEXT,

    CONSTRAINT "SalesReturnLine_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "SalesReturn_companyId_returnNumber_key" ON "SalesReturn"("companyId", "returnNumber");
CREATE UNIQUE INDEX "SalesReturn_companyId_creditNoteNumber_key" ON "SalesReturn"("companyId", "creditNoteNumber");
CREATE UNIQUE INDEX "SalesReturn_companyId_factoryId_id_key" ON "SalesReturn"("companyId", "factoryId", "id");
CREATE INDEX "SalesReturn_companyId_factoryId_status_createdAt_idx" ON "SalesReturn"("companyId", "factoryId", "status", "createdAt");
CREATE INDEX "SalesReturn_companyId_customerId_createdAt_idx" ON "SalesReturn"("companyId", "customerId", "createdAt");
CREATE INDEX "SalesReturn_companyId_salesOrderId_idx" ON "SalesReturn"("companyId", "salesOrderId");
CREATE INDEX "SalesReturn_companyId_dispatchId_idx" ON "SalesReturn"("companyId", "dispatchId");

-- CreateIndex
CREATE INDEX "SalesReturnLine_companyId_factoryId_itemId_restockStackId_idx" ON "SalesReturnLine"("companyId", "factoryId", "itemId", "restockStackId");

-- AddForeignKey
ALTER TABLE "SalesReturn" ADD CONSTRAINT "SalesReturn_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "SalesReturn" ADD CONSTRAINT "SalesReturn_companyId_factoryId_fkey" FOREIGN KEY ("companyId", "factoryId") REFERENCES "Factory"("companyId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "SalesReturn" ADD CONSTRAINT "SalesReturn_companyId_factoryId_salesOrderId_fkey" FOREIGN KEY ("companyId", "factoryId", "salesOrderId") REFERENCES "SalesOrder"("companyId", "factoryId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "SalesReturn" ADD CONSTRAINT "SalesReturn_companyId_factoryId_dispatchId_fkey" FOREIGN KEY ("companyId", "factoryId", "dispatchId") REFERENCES "Dispatch"("companyId", "factoryId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "SalesReturn" ADD CONSTRAINT "SalesReturn_companyId_customerId_fkey" FOREIGN KEY ("companyId", "customerId") REFERENCES "Partner"("companyId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SalesReturnLine" ADD CONSTRAINT "SalesReturnLine_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "SalesReturnLine" ADD CONSTRAINT "SalesReturnLine_companyId_factoryId_fkey" FOREIGN KEY ("companyId", "factoryId") REFERENCES "Factory"("companyId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "SalesReturnLine" ADD CONSTRAINT "SalesReturnLine_companyId_factoryId_salesReturnId_fkey" FOREIGN KEY ("companyId", "factoryId", "salesReturnId") REFERENCES "SalesReturn"("companyId", "factoryId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "SalesReturnLine" ADD CONSTRAINT "SalesReturnLine_companyId_factoryId_salesOrderLineId_fkey" FOREIGN KEY ("companyId", "factoryId", "salesOrderLineId") REFERENCES "SalesOrderLine"("companyId", "factoryId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "SalesReturnLine" ADD CONSTRAINT "SalesReturnLine_companyId_factoryId_dispatchLineId_fkey" FOREIGN KEY ("companyId", "factoryId", "dispatchLineId") REFERENCES "DispatchLine"("companyId", "factoryId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "SalesReturnLine" ADD CONSTRAINT "SalesReturnLine_companyId_itemId_fkey" FOREIGN KEY ("companyId", "itemId") REFERENCES "Item"("companyId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "SalesReturnLine" ADD CONSTRAINT "SalesReturnLine_companyId_factoryId_restockStackId_fkey" FOREIGN KEY ("companyId", "factoryId", "restockStackId") REFERENCES "Stack"("companyId", "factoryId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

