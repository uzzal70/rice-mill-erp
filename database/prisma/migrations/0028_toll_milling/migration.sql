-- CreateEnum
CREATE TYPE "TollOrderStatus" AS ENUM ('DRAFT', 'RECEIVED', 'IN_PROCESS', 'COMPLETED', 'CANCELLED');
CREATE TYPE "TollRateBasis" AS ENUM ('PER_KG', 'PER_MON', 'PER_BAG');
CREATE TYPE "ByProductPolicy" AS ENUM ('RETURN_TO_CUSTOMER', 'MILL_RETENTION');

-- CreateTable
CREATE TABLE "TollOrder" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "factoryId" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "paddyItemId" TEXT NOT NULL,
    "orderNumber" TEXT NOT NULL,
    "status" "TollOrderStatus" NOT NULL DEFAULT 'DRAFT',
    "receivedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "vehicleNumber" TEXT,
    "driverName" TEXT,
    "challanNumber" TEXT,
    "receivedBagCount" INTEGER NOT NULL DEFAULT 0,
    "receivedQuantityKg" DECIMAL(18,3) NOT NULL,
    "tollRate" DECIMAL(18,4) NOT NULL,
    "tollRateBasis" "TollRateBasis" NOT NULL DEFAULT 'PER_KG',
    "byProductPolicy" "ByProductPolicy" NOT NULL DEFAULT 'RETURN_TO_CUSTOMER',
    "processedQuantityKg" DECIMAL(18,3) NOT NULL DEFAULT 0,
    "totalRiceProducedKg" DECIMAL(18,3) NOT NULL DEFAULT 0,
    "totalByProductProducedKg" DECIMAL(18,3) NOT NULL DEFAULT 0,
    "totalRiceDeliveredKg" DECIMAL(18,3) NOT NULL DEFAULT 0,
    "totalByProductDeliveredKg" DECIMAL(18,3) NOT NULL DEFAULT 0,
    "tollChargeAmount" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "additionalCharges" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "totalAmount" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "remarks" TEXT,
    "createdById" TEXT NOT NULL,
    "approvedById" TEXT,
    "approvedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TollOrder_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TollBatch" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "factoryId" TEXT NOT NULL,
    "tollOrderId" TEXT NOT NULL,
    "batchNumber" TEXT NOT NULL,
    "status" "DocumentStatus" NOT NULL DEFAULT 'DRAFT',
    "inputPaddyKg" DECIMAL(18,3) NOT NULL,
    "headRiceKg" DECIMAL(18,3) NOT NULL DEFAULT 0,
    "brokenRiceKg" DECIMAL(18,3) NOT NULL DEFAULT 0,
    "riceBranKg" DECIMAL(18,3) NOT NULL DEFAULT 0,
    "huskKg" DECIMAL(18,3) NOT NULL DEFAULT 0,
    "totalOutputKg" DECIMAL(18,3) NOT NULL DEFAULT 0,
    "processLossKg" DECIMAL(18,3) NOT NULL DEFAULT 0,
    "recoveryPct" DECIMAL(7,3) NOT NULL DEFAULT 0,
    "headRiceRecoveryPct" DECIMAL(7,3) NOT NULL DEFAULT 0,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "remarks" TEXT,
    "createdById" TEXT NOT NULL,
    "approvedById" TEXT,
    "approvedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TollBatch_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TollDelivery" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "factoryId" TEXT NOT NULL,
    "tollOrderId" TEXT NOT NULL,
    "deliveryNumber" TEXT NOT NULL,
    "gatePassNumber" TEXT NOT NULL,
    "status" "DocumentStatus" NOT NULL DEFAULT 'DRAFT',
    "deliveryDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "vehicleNumber" TEXT NOT NULL,
    "driverName" TEXT NOT NULL,
    "driverMobile" TEXT,
    "totalBags" INTEGER NOT NULL DEFAULT 0,
    "riceDeliveredKg" DECIMAL(18,3) NOT NULL DEFAULT 0,
    "brokenRiceDeliveredKg" DECIMAL(18,3) NOT NULL DEFAULT 0,
    "byProductDeliveredKg" DECIMAL(18,3) NOT NULL DEFAULT 0,
    "totalDeliveredKg" DECIMAL(18,3) NOT NULL DEFAULT 0,
    "remarks" TEXT,
    "createdById" TEXT NOT NULL,
    "postedById" TEXT,
    "postedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TollDelivery_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "TollOrder_companyId_orderNumber_key" ON "TollOrder"("companyId", "orderNumber");
CREATE UNIQUE INDEX "TollOrder_companyId_factoryId_id_key" ON "TollOrder"("companyId", "factoryId", "id");
CREATE INDEX "TollOrder_companyId_factoryId_status_receivedAt_idx" ON "TollOrder"("companyId", "factoryId", "status", "receivedAt");
CREATE INDEX "TollOrder_companyId_customerId_createdAt_idx" ON "TollOrder"("companyId", "customerId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "TollBatch_companyId_batchNumber_key" ON "TollBatch"("companyId", "batchNumber");
CREATE UNIQUE INDEX "TollBatch_companyId_factoryId_id_key" ON "TollBatch"("companyId", "factoryId", "id");
CREATE INDEX "TollBatch_companyId_factoryId_tollOrderId_idx" ON "TollBatch"("companyId", "factoryId", "tollOrderId");

-- CreateIndex
CREATE UNIQUE INDEX "TollDelivery_companyId_deliveryNumber_key" ON "TollDelivery"("companyId", "deliveryNumber");
CREATE UNIQUE INDEX "TollDelivery_companyId_gatePassNumber_key" ON "TollDelivery"("companyId", "gatePassNumber");
CREATE UNIQUE INDEX "TollDelivery_companyId_factoryId_id_key" ON "TollDelivery"("companyId", "factoryId", "id");
CREATE INDEX "TollDelivery_companyId_factoryId_tollOrderId_idx" ON "TollDelivery"("companyId", "factoryId", "tollOrderId");

-- AddForeignKey
ALTER TABLE "TollOrder" ADD CONSTRAINT "TollOrder_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "TollOrder" ADD CONSTRAINT "TollOrder_companyId_factoryId_fkey" FOREIGN KEY ("companyId", "factoryId") REFERENCES "Factory"("companyId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "TollOrder" ADD CONSTRAINT "TollOrder_companyId_customerId_fkey" FOREIGN KEY ("companyId", "customerId") REFERENCES "Partner"("companyId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "TollOrder" ADD CONSTRAINT "TollOrder_companyId_paddyItemId_fkey" FOREIGN KEY ("companyId", "paddyItemId") REFERENCES "Item"("companyId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TollBatch" ADD CONSTRAINT "TollBatch_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "TollBatch" ADD CONSTRAINT "TollBatch_companyId_factoryId_fkey" FOREIGN KEY ("companyId", "factoryId") REFERENCES "Factory"("companyId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "TollBatch" ADD CONSTRAINT "TollBatch_companyId_factoryId_tollOrderId_fkey" FOREIGN KEY ("companyId", "factoryId", "tollOrderId") REFERENCES "TollOrder"("companyId", "factoryId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TollDelivery" ADD CONSTRAINT "TollDelivery_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "TollDelivery" ADD CONSTRAINT "TollDelivery_companyId_factoryId_fkey" FOREIGN KEY ("companyId", "factoryId") REFERENCES "Factory"("companyId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "TollDelivery" ADD CONSTRAINT "TollDelivery_companyId_factoryId_tollOrderId_fkey" FOREIGN KEY ("companyId", "factoryId", "tollOrderId") REFERENCES "TollOrder"("companyId", "factoryId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

