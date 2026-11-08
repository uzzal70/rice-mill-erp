-- CreateTable
CREATE TABLE "SalesQuotation" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "factoryId" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "quotationNumber" TEXT NOT NULL,
    "channel" TEXT NOT NULL,
    "status" "DocumentStatus" NOT NULL DEFAULT 'DRAFT',
    "validUntil" TIMESTAMP(3) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'BDT',
    "exchangeRate" DECIMAL(12,4) NOT NULL DEFAULT 1,
    "totalAmount" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "remarks" TEXT,
    "createdById" TEXT NOT NULL,
    "approvedById" TEXT,
    "approvedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SalesQuotation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SalesQuotationLine" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "factoryId" TEXT NOT NULL,
    "quotationId" TEXT NOT NULL,
    "itemId" TEXT NOT NULL,
    "quantityKg" DECIMAL(18,3) NOT NULL,
    "unitRate" DECIMAL(18,4) NOT NULL,
    "lineAmount" DECIMAL(18,2) NOT NULL,

    CONSTRAINT "SalesQuotationLine_pkey" PRIMARY KEY ("id")
);

-- AlterTable
ALTER TABLE "SalesOrder" ADD COLUMN "quotationId" TEXT;
ALTER TABLE "SalesOrder" ADD COLUMN "exchangeRate" DECIMAL(12,4) NOT NULL DEFAULT 1;
ALTER TABLE "SalesOrder" ADD COLUMN "exportCountry" TEXT;
ALTER TABLE "SalesOrder" ADD COLUMN "portOfDischarge" TEXT;
ALTER TABLE "SalesOrder" ADD COLUMN "lcNumber" TEXT;

-- AlterTable
ALTER TABLE "SalesOrderLine" ADD COLUMN "packagingItemId" TEXT;
ALTER TABLE "SalesOrderLine" ADD COLUMN "bagCount" INTEGER;

-- CreateIndex
CREATE UNIQUE INDEX "SalesQuotation_companyId_quotationNumber_key" ON "SalesQuotation"("companyId", "quotationNumber");
CREATE UNIQUE INDEX "SalesQuotation_companyId_factoryId_id_key" ON "SalesQuotation"("companyId", "factoryId", "id");
CREATE INDEX "SalesQuotation_companyId_factoryId_status_createdAt_idx" ON "SalesQuotation"("companyId", "factoryId", "status", "createdAt");
CREATE INDEX "SalesQuotation_companyId_customerId_createdAt_idx" ON "SalesQuotation"("companyId", "customerId", "createdAt");

-- CreateIndex
CREATE INDEX "SalesQuotationLine_companyId_factoryId_itemId_idx" ON "SalesQuotationLine"("companyId", "factoryId", "itemId");

-- AddForeignKey
ALTER TABLE "SalesQuotation" ADD CONSTRAINT "SalesQuotation_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "SalesQuotation" ADD CONSTRAINT "SalesQuotation_companyId_factoryId_fkey" FOREIGN KEY ("companyId", "factoryId") REFERENCES "Factory"("companyId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "SalesQuotation" ADD CONSTRAINT "SalesQuotation_companyId_customerId_fkey" FOREIGN KEY ("companyId", "customerId") REFERENCES "Partner"("companyId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SalesQuotationLine" ADD CONSTRAINT "SalesQuotationLine_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "SalesQuotationLine" ADD CONSTRAINT "SalesQuotationLine_companyId_factoryId_fkey" FOREIGN KEY ("companyId", "factoryId") REFERENCES "Factory"("companyId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "SalesQuotationLine" ADD CONSTRAINT "SalesQuotationLine_companyId_factoryId_quotationId_fkey" FOREIGN KEY ("companyId", "factoryId", "quotationId") REFERENCES "SalesQuotation"("companyId", "factoryId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "SalesQuotationLine" ADD CONSTRAINT "SalesQuotationLine_companyId_itemId_fkey" FOREIGN KEY ("companyId", "itemId") REFERENCES "Item"("companyId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SalesOrder" ADD CONSTRAINT "SalesOrder_companyId_factoryId_quotationId_fkey" FOREIGN KEY ("companyId", "factoryId", "quotationId") REFERENCES "SalesQuotation"("companyId", "factoryId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SalesOrderLine" ADD CONSTRAINT "SalesOrderLine_companyId_packagingItemId_fkey" FOREIGN KEY ("companyId", "packagingItemId") REFERENCES "Item"("companyId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

