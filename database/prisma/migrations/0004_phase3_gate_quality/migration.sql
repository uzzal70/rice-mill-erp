CREATE TYPE "GateDirection" AS ENUM ('INWARD', 'OUTWARD');
CREATE TYPE "GatePurpose" AS ENUM ('PROCUREMENT', 'SALES', 'TRANSFER', 'TOLL_MILLING', 'OTHER');
CREATE TYPE "GateStatus" AS ENUM ('ENTRY', 'WEIGHING', 'QUALITY', 'RECEIVING', 'COMPLETED', 'REJECTED', 'CANCELLED');
CREATE TYPE "QualitySampleType" AS ENUM ('GATE', 'PIT', 'FINAL');
CREATE TYPE "QualitySampleStatus" AS ENUM ('SAMPLE', 'TESTED', 'APPROVED', 'REJECTED');
CREATE TYPE "QualityDecision" AS ENUM ('ACCEPT', 'REJECT');

CREATE TABLE "Vehicle" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "vehicleNumber" TEXT NOT NULL,
    "registrationNumber" TEXT,
    "vehicleType" TEXT NOT NULL,
    "ownerName" TEXT,
    "driverName" TEXT,
    "driverMobile" TEXT,
    "fitnessExpiry" TIMESTAMP(3),
    "insuranceExpiry" TIMESTAMP(3),
    "taxTokenExpiry" TIMESTAMP(3),
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Vehicle_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "GateEntry" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "factoryId" TEXT NOT NULL,
    "gateNumber" TEXT NOT NULL,
    "direction" "GateDirection" NOT NULL,
    "purpose" "GatePurpose" NOT NULL,
    "status" "GateStatus" NOT NULL DEFAULT 'ENTRY',
    "vehicleId" TEXT,
    "vehicleNumber" TEXT NOT NULL,
    "driverName" TEXT,
    "driverMobile" TEXT,
    "partnerId" TEXT,
    "itemId" TEXT,
    "challanNumber" TEXT,
    "referenceNumber" TEXT,
    "remarks" TEXT,
    "enteredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "GateEntry_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "WeighbridgeTicket" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "factoryId" TEXT NOT NULL,
    "gateEntryId" TEXT NOT NULL,
    "ticketNumber" TEXT NOT NULL,
    "grossWeight" DECIMAL(18,3) NOT NULL,
    "tareWeight" DECIMAL(18,3) NOT NULL,
    "netWeight" DECIMAL(18,3) NOT NULL,
    "firstWeightAt" TIMESTAMP(3) NOT NULL,
    "secondWeightAt" TIMESTAMP(3) NOT NULL,
    "isManual" BOOLEAN NOT NULL DEFAULT true,
    "remarks" TEXT,
    "operatorId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "WeighbridgeTicket_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "WeighbridgeTicket_weight_check" CHECK ("grossWeight" > "tareWeight" AND "tareWeight" >= 0 AND "netWeight" > 0 AND "netWeight" = "grossWeight" - "tareWeight"),
    CONSTRAINT "WeighbridgeTicket_time_check" CHECK ("firstWeightAt" <= "secondWeightAt")
);

CREATE TABLE "QualitySample" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "factoryId" TEXT NOT NULL,
    "gateEntryId" TEXT NOT NULL,
    "sampleNumber" TEXT NOT NULL,
    "sampleType" "QualitySampleType" NOT NULL,
    "status" "QualitySampleStatus" NOT NULL DEFAULT 'SAMPLE',
    "measurements" JSONB NOT NULL DEFAULT '{}',
    "decision" "QualityDecision",
    "comments" TEXT,
    "sampledById" TEXT NOT NULL,
    "testedById" TEXT,
    "approvedById" TEXT,
    "testedAt" TIMESTAMP(3),
    "approvedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "QualitySample_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Vehicle_companyId_id_key" ON "Vehicle"("companyId", "id");
CREATE UNIQUE INDEX "Vehicle_companyId_vehicleNumber_key" ON "Vehicle"("companyId", "vehicleNumber");
CREATE INDEX "Vehicle_companyId_active_idx" ON "Vehicle"("companyId", "active");

CREATE UNIQUE INDEX "GateEntry_companyId_factoryId_id_key" ON "GateEntry"("companyId", "factoryId", "id");
CREATE UNIQUE INDEX "GateEntry_companyId_gateNumber_key" ON "GateEntry"("companyId", "gateNumber");
CREATE INDEX "GateEntry_companyId_factoryId_status_enteredAt_idx" ON "GateEntry"("companyId", "factoryId", "status", "enteredAt");

CREATE UNIQUE INDEX "WeighbridgeTicket_gateEntryId_key" ON "WeighbridgeTicket"("gateEntryId");
CREATE UNIQUE INDEX "WeighbridgeTicket_companyId_ticketNumber_key" ON "WeighbridgeTicket"("companyId", "ticketNumber");
CREATE UNIQUE INDEX "WeighbridgeTicket_companyId_factoryId_gateEntryId_key" ON "WeighbridgeTicket"("companyId", "factoryId", "gateEntryId");
CREATE INDEX "WeighbridgeTicket_companyId_factoryId_firstWeightAt_idx" ON "WeighbridgeTicket"("companyId", "factoryId", "firstWeightAt");

CREATE UNIQUE INDEX "QualitySample_companyId_sampleNumber_key" ON "QualitySample"("companyId", "sampleNumber");
CREATE INDEX "QualitySample_companyId_factoryId_gateEntryId_createdAt_idx" ON "QualitySample"("companyId", "factoryId", "gateEntryId", "createdAt");

ALTER TABLE "Vehicle" ADD CONSTRAINT "Vehicle_companyId_fkey"
FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "GateEntry" ADD CONSTRAINT "GateEntry_companyId_fkey"
FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "GateEntry" ADD CONSTRAINT "GateEntry_companyId_factoryId_fkey"
FOREIGN KEY ("companyId", "factoryId") REFERENCES "Factory"("companyId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "GateEntry" ADD CONSTRAINT "GateEntry_companyId_vehicleId_fkey"
FOREIGN KEY ("companyId", "vehicleId") REFERENCES "Vehicle"("companyId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "GateEntry" ADD CONSTRAINT "GateEntry_companyId_partnerId_fkey"
FOREIGN KEY ("companyId", "partnerId") REFERENCES "Partner"("companyId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "GateEntry" ADD CONSTRAINT "GateEntry_companyId_itemId_fkey"
FOREIGN KEY ("companyId", "itemId") REFERENCES "Item"("companyId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "GateEntry" ADD CONSTRAINT "GateEntry_createdById_fkey"
FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "WeighbridgeTicket" ADD CONSTRAINT "WeighbridgeTicket_companyId_fkey"
FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "WeighbridgeTicket" ADD CONSTRAINT "WeighbridgeTicket_companyId_factoryId_fkey"
FOREIGN KEY ("companyId", "factoryId") REFERENCES "Factory"("companyId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "WeighbridgeTicket" ADD CONSTRAINT "WeighbridgeTicket_companyId_factoryId_gateEntryId_fkey"
FOREIGN KEY ("companyId", "factoryId", "gateEntryId") REFERENCES "GateEntry"("companyId", "factoryId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "WeighbridgeTicket" ADD CONSTRAINT "WeighbridgeTicket_operatorId_fkey"
FOREIGN KEY ("operatorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "QualitySample" ADD CONSTRAINT "QualitySample_companyId_fkey"
FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "QualitySample" ADD CONSTRAINT "QualitySample_companyId_factoryId_fkey"
FOREIGN KEY ("companyId", "factoryId") REFERENCES "Factory"("companyId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "QualitySample" ADD CONSTRAINT "QualitySample_companyId_factoryId_gateEntryId_fkey"
FOREIGN KEY ("companyId", "factoryId", "gateEntryId") REFERENCES "GateEntry"("companyId", "factoryId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "QualitySample" ADD CONSTRAINT "QualitySample_sampledById_fkey"
FOREIGN KEY ("sampledById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "QualitySample" ADD CONSTRAINT "QualitySample_testedById_fkey"
FOREIGN KEY ("testedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "QualitySample" ADD CONSTRAINT "QualitySample_approvedById_fkey"
FOREIGN KEY ("approvedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
