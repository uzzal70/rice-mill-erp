-- CreateEnum
CREATE TYPE "ExpenseCategory" AS ENUM ('ELECTRICITY', 'DIESEL', 'GAS', 'LABOUR', 'REPAIR', 'MAINTENANCE', 'TRANSPORT', 'LOADING', 'UNLOADING', 'PACKAGING', 'RENT', 'SECURITY', 'OFFICE', 'MISCELLANEOUS');
CREATE TYPE "ExpenseType" AS ENUM ('FACTORY_EXPENSE', 'OFFICE_EXPENSE', 'PRODUCTION_EXPENSE', 'TRANSPORT_EXPENSE', 'ADMINISTRATIVE_EXPENSE');
CREATE TYPE "ExpensePaymentMode" AS ENUM ('CASH', 'BANK', 'PETTY_CASH', 'PAYABLE');

-- CreateTable
CREATE TABLE "Expense" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "factoryId" TEXT NOT NULL,
    "voucherNumber" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "category" "ExpenseCategory" NOT NULL,
    "type" "ExpenseType" NOT NULL,
    "paymentMode" "ExpensePaymentMode" NOT NULL DEFAULT 'CASH',
    "status" "DocumentStatus" NOT NULL DEFAULT 'DRAFT',
    "expenseDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "payeeName" TEXT,
    "payeePartnerId" TEXT,
    "vehicleId" TEXT,
    "productionLineId" TEXT,
    "bankName" TEXT,
    "bankAccount" TEXT,
    "chequeOrTxnNumber" TEXT,
    "billReference" TEXT,
    "subtotalAmount" DECIMAL(18,2) NOT NULL,
    "taxAmount" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "totalAmount" DECIMAL(18,2) NOT NULL,
    "remarks" TEXT,
    "rejectionReason" TEXT,
    "createdById" TEXT NOT NULL,
    "approvedById" TEXT,
    "postedById" TEXT,
    "rejectedById" TEXT,
    "approvedAt" TIMESTAMP(3),
    "postedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Expense_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ExpenseLine" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "factoryId" TEXT NOT NULL,
    "expenseId" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "quantity" DECIMAL(18,2),
    "unitPrice" DECIMAL(18,2),
    "amount" DECIMAL(18,2) NOT NULL,
    "accountCode" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ExpenseLine_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Expense_companyId_voucherNumber_key" ON "Expense"("companyId", "voucherNumber");
CREATE UNIQUE INDEX "Expense_companyId_factoryId_id_key" ON "Expense"("companyId", "factoryId", "id");
CREATE INDEX "Expense_companyId_factoryId_status_expenseDate_idx" ON "Expense"("companyId", "factoryId", "status", "expenseDate");
CREATE INDEX "Expense_companyId_category_expenseDate_idx" ON "Expense"("companyId", "category", "expenseDate");
CREATE INDEX "Expense_companyId_type_expenseDate_idx" ON "Expense"("companyId", "type", "expenseDate");
CREATE INDEX "Expense_companyId_payeePartnerId_idx" ON "Expense"("companyId", "payeePartnerId");

-- CreateIndex
CREATE INDEX "ExpenseLine_companyId_factoryId_expenseId_idx" ON "ExpenseLine"("companyId", "factoryId", "expenseId");

-- AddForeignKey
ALTER TABLE "Expense" ADD CONSTRAINT "Expense_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Expense" ADD CONSTRAINT "Expense_companyId_factoryId_fkey" FOREIGN KEY ("companyId", "factoryId") REFERENCES "Factory"("companyId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Expense" ADD CONSTRAINT "Expense_companyId_payeePartnerId_fkey" FOREIGN KEY ("companyId", "payeePartnerId") REFERENCES "Partner"("companyId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Expense" ADD CONSTRAINT "Expense_companyId_vehicleId_fkey" FOREIGN KEY ("companyId", "vehicleId") REFERENCES "Vehicle"("companyId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Expense" ADD CONSTRAINT "Expense_companyId_factoryId_productionLineId_fkey" FOREIGN KEY ("companyId", "factoryId", "productionLineId") REFERENCES "ProductionLine"("companyId", "factoryId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExpenseLine" ADD CONSTRAINT "ExpenseLine_companyId_factoryId_expenseId_fkey" FOREIGN KEY ("companyId", "factoryId", "expenseId") REFERENCES "Expense"("companyId", "factoryId", "id") ON DELETE CASCADE ON UPDATE CASCADE;

