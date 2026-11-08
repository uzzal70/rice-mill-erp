ALTER TYPE "UnitOfMeasure" ADD VALUE 'MON' AFTER 'KG';
CREATE TYPE "BrokerCommissionType" AS ENUM ('PER_KG', 'PER_MON', 'PER_TON', 'PERCENTAGE', 'FIXED_AMOUNT');

ALTER TABLE "Partner"
    ADD COLUMN "businessName" TEXT,
    ADD COLUMN "nid" TEXT,
    ADD COLUMN "tin" TEXT,
    ADD COLUMN "bin" TEXT,
    ADD COLUMN "bankName" TEXT,
    ADD COLUMN "bankAccount" TEXT,
    ADD COLUMN "paymentMethod" TEXT,
    ADD COLUMN "creditLimit" DECIMAL(18,2),
    ADD COLUMN "paymentTermsDays" INTEGER,
    ADD COLUMN "commissionType" "BrokerCommissionType",
    ADD COLUMN "commissionRate" DECIMAL(18,4),
    ADD COLUMN "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    ADD COLUMN "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

ALTER TABLE "Partner" ALTER COLUMN "updatedAt" DROP DEFAULT;
CREATE UNIQUE INDEX "Partner_companyId_id_key" ON "Partner"("companyId", "id");

ALTER TABLE "Item"
    ADD COLUMN "localName" TEXT,
    ADD COLUMN "brand" TEXT,
    ADD COLUMN "riceType" TEXT,
    ADD COLUMN "defaultPackagingLabel" TEXT,
    ADD COLUMN "headRicePercentage" DECIMAL(5,2),
    ADD COLUMN "brokenPercentage" DECIMAL(5,2),
    ADD COLUMN "purchasePrice" DECIMAL(18,4),
    ADD COLUMN "salesPrice" DECIMAL(18,4),
    ADD COLUMN "description" TEXT,
    ADD COLUMN "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    ADD COLUMN "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

ALTER TABLE "Item" ALTER COLUMN "updatedAt" DROP DEFAULT;
CREATE UNIQUE INDEX "Item_companyId_id_key" ON "Item"("companyId", "id");

CREATE TABLE "PackagingSpec" (
    "id" TEXT NOT NULL,
    "itemId" TEXT NOT NULL,
    "supplierPartnerId" TEXT,
    "bagType" TEXT,
    "sizeKg" DECIMAL(14,3) NOT NULL,
    "material" TEXT NOT NULL,
    "unitCost" DECIMAL(18,4) NOT NULL DEFAULT 0,
    CONSTRAINT "PackagingSpec_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "PackagingSpec_itemId_key" ON "PackagingSpec"("itemId");
CREATE INDEX "PackagingSpec_supplierPartnerId_idx" ON "PackagingSpec"("supplierPartnerId");

CREATE TABLE "UnitConversion" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "fromUnit" "UnitOfMeasure" NOT NULL,
    "toUnit" "UnitOfMeasure" NOT NULL,
    "factor" DECIMAL(18,8) NOT NULL,
    "effectiveFrom" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "UnitConversion_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "UnitConversion_companyId_fromUnit_toUnit_effectiveFrom_key" ON "UnitConversion"("companyId", "fromUnit", "toUnit", "effectiveFrom");
CREATE INDEX "UnitConversion_companyId_fromUnit_toUnit_effectiveFrom_idx" ON "UnitConversion"("companyId", "fromUnit", "toUnit", "effectiveFrom");

ALTER TABLE "PackagingSpec" ADD CONSTRAINT "PackagingSpec_itemId_fkey"
FOREIGN KEY ("itemId") REFERENCES "Item"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PackagingSpec" ADD CONSTRAINT "PackagingSpec_supplierPartnerId_fkey"
FOREIGN KEY ("supplierPartnerId") REFERENCES "Partner"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "UnitConversion" ADD CONSTRAINT "UnitConversion_companyId_fkey"
FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;
