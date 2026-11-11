-- CreateEnum
CREATE TYPE "TaxType" AS ENUM ('VAT', 'AIT', 'TDS', 'VDS');

-- CreateTable
CREATE TABLE "TaxConfig" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "taxType" "TaxType" NOT NULL,
    "name" TEXT NOT NULL,
    "ratePercent" DECIMAL(7,4) NOT NULL,
    "effectiveFrom" TIMESTAMP(3) NOT NULL,
    "effectiveTo" TIMESTAMP(3),
    "category" TEXT,
    "sroReference" TEXT,
    "description" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TaxConfig_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "TaxConfig_companyId_taxType_category_effectiveFrom_key" ON "TaxConfig"("companyId", "taxType", "category", "effectiveFrom");

-- CreateIndex
CREATE INDEX "TaxConfig_companyId_taxType_effectiveFrom_effectiveTo_idx" ON "TaxConfig"("companyId", "taxType", "effectiveFrom", "effectiveTo");

-- AddForeignKey
ALTER TABLE "TaxConfig" ADD CONSTRAINT "TaxConfig_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

