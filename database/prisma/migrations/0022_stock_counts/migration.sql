CREATE TABLE "StockCount" (
  "id" TEXT NOT NULL,
  "companyId" TEXT NOT NULL,
  "factoryId" TEXT NOT NULL,
  "countNumber" TEXT NOT NULL,
  "itemId" TEXT NOT NULL,
  "stackId" TEXT NOT NULL,
  "bookQuantity" DECIMAL(18,3) NOT NULL,
  "countedQuantity" DECIMAL(18,3) NOT NULL,
  "adjustmentQuantity" DECIMAL(18,3) NOT NULL,
  "unit" "UnitOfMeasure" NOT NULL DEFAULT 'KG',
  "status" "DocumentStatus" NOT NULL DEFAULT 'DRAFT',
  "reason" TEXT NOT NULL,
  "countedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "createdById" TEXT NOT NULL,
  "postedById" TEXT,
  "postedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "StockCount_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "StockCount_companyId_countNumber_key" ON "StockCount"("companyId", "countNumber");
CREATE INDEX "StockCount_companyId_factoryId_itemId_countedAt_idx" ON "StockCount"("companyId", "factoryId", "itemId", "countedAt");
ALTER TABLE "StockCount" ADD CONSTRAINT "StockCount_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "StockCount" ADD CONSTRAINT "StockCount_companyId_factoryId_fkey" FOREIGN KEY ("companyId", "factoryId") REFERENCES "Factory"("companyId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "StockCount" ADD CONSTRAINT "StockCount_companyId_itemId_fkey" FOREIGN KEY ("companyId", "itemId") REFERENCES "Item"("companyId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "StockCount" ADD CONSTRAINT "StockCount_companyId_factoryId_stackId_fkey" FOREIGN KEY ("companyId", "factoryId", "stackId") REFERENCES "Stack"("companyId", "factoryId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "StockCount" ADD CONSTRAINT "StockCount_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "StockCount" ADD CONSTRAINT "StockCount_postedById_fkey" FOREIGN KEY ("postedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
