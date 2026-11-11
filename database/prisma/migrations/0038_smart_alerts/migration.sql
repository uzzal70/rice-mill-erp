-- CreateEnum
CREATE TYPE "AlertSeverity" AS ENUM ('CRITICAL', 'WARNING', 'INFO');

-- CreateEnum
CREATE TYPE "AlertCategory" AS ENUM ('INVENTORY', 'QUALITY', 'FINANCE', 'COMPLIANCE', 'MAINTENANCE', 'OPERATIONS');

-- CreateEnum
CREATE TYPE "AlertType" AS ENUM (
  'LOW_STOCK',
  'HIGH_MOISTURE',
  'LOW_RECOVERY',
  'CUSTOMER_OVERDUE',
  'SUPPLIER_PAYMENT_DUE',
  'DOCUMENT_EXPIRING',
  'MACHINE_MAINTENANCE_DUE',
  'UNUSUAL_WEIGHT',
  'UNUSUAL_PRODUCTION_LOSS',
  'NEGATIVE_MARGIN',
  'SLOW_MOVING_STOCK'
);

-- CreateTable
CREATE TABLE "SmartAlert" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "factoryId" TEXT,
    "type" "AlertType" NOT NULL,
    "category" "AlertCategory" NOT NULL,
    "severity" "AlertSeverity" NOT NULL DEFAULT 'WARNING',
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "referenceType" TEXT,
    "referenceId" TEXT,
    "metricValue" DECIMAL(18,4),
    "thresholdValue" DECIMAL(18,4),
    "isDismissed" BOOLEAN NOT NULL DEFAULT false,
    "dismissedAt" TIMESTAMP(3),
    "dismissedById" TEXT,
    "acknowledgedAt" TIMESTAMP(3),
    "acknowledgedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SmartAlert_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AlertRule" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "factoryId" TEXT,
    "type" "AlertType" NOT NULL,
    "isEnabled" BOOLEAN NOT NULL DEFAULT true,
    "severity" "AlertSeverity" NOT NULL DEFAULT 'WARNING',
    "thresholdValue" DECIMAL(18,4) NOT NULL,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AlertRule_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "SmartAlert_companyId_isDismissed_severity_idx" ON "SmartAlert"("companyId", "isDismissed", "severity");

-- CreateIndex
CREATE INDEX "SmartAlert_companyId_type_referenceId_idx" ON "SmartAlert"("companyId", "type", "referenceId");

-- CreateIndex
CREATE UNIQUE INDEX "AlertRule_companyId_type_key" ON "AlertRule"("companyId", "type");

-- AddForeignKey
ALTER TABLE "SmartAlert" ADD CONSTRAINT "SmartAlert_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SmartAlert" ADD CONSTRAINT "SmartAlert_factoryId_fkey" FOREIGN KEY ("factoryId") REFERENCES "Factory"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AlertRule" ADD CONSTRAINT "AlertRule_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

