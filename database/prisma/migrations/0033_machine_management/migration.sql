-- CreateTable
CREATE TABLE "Machine" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "factoryId" TEXT NOT NULL,
    "productionLineId" TEXT,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "machineType" TEXT NOT NULL DEFAULT 'RICE_MILL',
    "brand" TEXT,
    "modelNumber" TEXT,
    "capacity" TEXT,
    "purchaseDate" TIMESTAMP(3),
    "purchaseCost" DECIMAL(18,2),
    "totalRunHours" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'OPERATIONAL',
    "lastServiceDate" TIMESTAMP(3),
    "nextServiceDate" TIMESTAMP(3),
    "serviceIntervalHours" DECIMAL(18,2),
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Machine_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MachineLog" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "factoryId" TEXT NOT NULL,
    "machineId" TEXT NOT NULL,
    "logDate" TIMESTAMP(3) NOT NULL,
    "startHours" DECIMAL(18,2) NOT NULL,
    "endHours" DECIMAL(18,2) NOT NULL,
    "runHours" DECIMAL(18,2) NOT NULL,
    "energyOrFuelConsumed" DECIMAL(18,2),
    "operatorName" TEXT,
    "remarks" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MachineLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MachineMaintenance" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "factoryId" TEXT NOT NULL,
    "machineId" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'PREVENTIVE',
    "title" TEXT NOT NULL,
    "description" TEXT,
    "startDate" TIMESTAMP(3) NOT NULL,
    "completedDate" TIMESTAMP(3),
    "technicianName" TEXT,
    "status" TEXT NOT NULL DEFAULT 'SCHEDULED',
    "labourCost" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "sparePartsCost" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "totalCost" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "nextServiceDueDate" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MachineMaintenance_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MachineSparePartUsage" (
    "id" TEXT NOT NULL,
    "maintenanceId" TEXT NOT NULL,
    "partName" TEXT NOT NULL,
    "partNumber" TEXT,
    "quantity" DECIMAL(18,2) NOT NULL,
    "unitCost" DECIMAL(18,2) NOT NULL,
    "totalCost" DECIMAL(18,2) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MachineSparePartUsage_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Machine_companyId_factoryId_code_key" ON "Machine"("companyId", "factoryId", "code");
CREATE INDEX "Machine_companyId_factoryId_machineType_status_idx" ON "Machine"("companyId", "factoryId", "machineType", "status");

-- CreateIndex
CREATE INDEX "MachineLog_machineId_logDate_idx" ON "MachineLog"("machineId", "logDate");

-- CreateIndex
CREATE INDEX "MachineMaintenance_machineId_status_startDate_idx" ON "MachineMaintenance"("machineId", "status", "startDate");

-- CreateIndex
CREATE INDEX "MachineSparePartUsage_maintenanceId_idx" ON "MachineSparePartUsage"("maintenanceId");

-- AddForeignKey
ALTER TABLE "Machine" ADD CONSTRAINT "Machine_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Machine" ADD CONSTRAINT "Machine_companyId_factoryId_fkey" FOREIGN KEY ("companyId", "factoryId") REFERENCES "Factory"("companyId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Machine" ADD CONSTRAINT "Machine_companyId_factoryId_productionLineId_fkey" FOREIGN KEY ("companyId", "factoryId", "productionLineId") REFERENCES "ProductionLine"("companyId", "factoryId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MachineLog" ADD CONSTRAINT "MachineLog_machineId_fkey" FOREIGN KEY ("machineId") REFERENCES "Machine"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MachineMaintenance" ADD CONSTRAINT "MachineMaintenance_machineId_fkey" FOREIGN KEY ("machineId") REFERENCES "Machine"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MachineSparePartUsage" ADD CONSTRAINT "MachineSparePartUsage_maintenanceId_fkey" FOREIGN KEY ("maintenanceId") REFERENCES "MachineMaintenance"("id") ON DELETE CASCADE ON UPDATE CASCADE;

