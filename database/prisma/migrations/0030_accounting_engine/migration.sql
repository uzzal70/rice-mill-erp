-- CreateEnum
CREATE TYPE "AccountType" AS ENUM ('ASSET', 'LIABILITY', 'EQUITY', 'REVENUE', 'EXPENSE');

-- CreateEnum
CREATE TYPE "AccountSubtype" AS ENUM ('CASH', 'BANK', 'ACCOUNTS_RECEIVABLE', 'INVENTORY_RAW', 'INVENTORY_FINISHED', 'INVENTORY_BYPRODUCT', 'FIXED_ASSET', 'CURRENT_ASSET', 'ACCOUNTS_PAYABLE', 'TAX_PAYABLE', 'CURRENT_LIABILITY', 'LONG_TERM_LIABILITY', 'SHARE_CAPITAL', 'RETAINED_EARNINGS', 'OPERATING_REVENUE', 'OTHER_INCOME', 'COST_OF_GOODS_SOLD', 'DIRECT_EXPENSE', 'INDIRECT_EXPENSE', 'ADMINISTRATIVE_EXPENSE');

-- CreateEnum
CREATE TYPE "VoucherType" AS ENUM ('JOURNAL', 'PAYMENT', 'RECEIPT', 'CONTRA', 'SALES', 'PURCHASE', 'EXPENSE', 'OPENING');

-- CreateTable
CREATE TABLE "Account" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" "AccountType" NOT NULL,
    "subtype" "AccountSubtype",
    "currency" TEXT NOT NULL DEFAULT 'BDT',
    "openingBalance" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "currentBalance" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "isSystem" BOOLEAN NOT NULL DEFAULT false,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "description" TEXT,
    "parentId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Account_pkey" PRIMARY KEY ("id")
);

-- AlterTable Journal
ALTER TABLE "Journal" ADD COLUMN "voucherType" "VoucherType" NOT NULL DEFAULT 'JOURNAL',
ADD COLUMN "voucherDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN "narration" TEXT,
ADD COLUMN "totalAmount" DECIMAL(18,2) NOT NULL DEFAULT 0,
ADD COLUMN "factoryId" TEXT,
ADD COLUMN "createdById" TEXT,
ADD COLUMN "chequeOrRefNo" TEXT,
ADD COLUMN "partnerId" TEXT;

-- AlterTable JournalLine
ALTER TABLE "JournalLine" ADD COLUMN "accountId" TEXT,
ADD COLUMN "partnerId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Account_companyId_code_key" ON "Account"("companyId", "code");
CREATE UNIQUE INDEX "Account_companyId_id_key" ON "Account"("companyId", "id");
CREATE INDEX "Account_companyId_type_idx" ON "Account"("companyId", "type");
CREATE INDEX "Account_companyId_subtype_idx" ON "Account"("companyId", "subtype");
CREATE INDEX "Account_companyId_active_idx" ON "Account"("companyId", "active");

-- CreateIndex
CREATE INDEX "Journal_companyId_voucherDate_idx" ON "Journal"("companyId", "voucherDate");
CREATE INDEX "Journal_companyId_voucherType_idx" ON "Journal"("companyId", "voucherType");
CREATE INDEX "JournalLine_accountId_idx" ON "JournalLine"("accountId");
CREATE INDEX "JournalLine_journalId_idx" ON "JournalLine"("journalId");

-- AddForeignKey
ALTER TABLE "Account" ADD CONSTRAINT "Account_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Account" ADD CONSTRAINT "Account_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "Account"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Journal" ADD CONSTRAINT "Journal_companyId_partnerId_fkey" FOREIGN KEY ("companyId", "partnerId") REFERENCES "Partner"("companyId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JournalLine" DROP CONSTRAINT IF EXISTS "JournalLine_journalId_fkey";
ALTER TABLE "JournalLine" ADD CONSTRAINT "JournalLine_journalId_fkey" FOREIGN KEY ("journalId") REFERENCES "Journal"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "JournalLine" ADD CONSTRAINT "JournalLine_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "Account"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

