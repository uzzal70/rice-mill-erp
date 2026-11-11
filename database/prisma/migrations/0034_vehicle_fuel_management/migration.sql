-- CreateTable
CREATE TABLE "VehicleTrip" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "factoryId" TEXT,
    "vehicleId" TEXT NOT NULL,
    "tripNumber" TEXT NOT NULL,
    "driverName" TEXT NOT NULL,
    "driverPhone" TEXT,
    "tripDate" TIMESTAMP(3) NOT NULL,
    "origin" TEXT NOT NULL,
    "destination" TEXT NOT NULL,
    "startOdometer" DECIMAL(18,2) NOT NULL,
    "endOdometer" DECIMAL(18,2) NOT NULL,
    "distanceKm" DECIMAL(18,2) NOT NULL,
    "cargoDescription" TEXT,
    "cargoWeightKg" DECIMAL(18,3),
    "freightAmount" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "fuelCost" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "tollOtherCost" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "totalTransportCost" DECIMAL(18,2) NOT NULL,
    "fuelCostPerKm" DECIMAL(18,4) NOT NULL DEFAULT 0,
    "transportCostPerKm" DECIMAL(18,4) NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'COMPLETED',
    "remarks" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "VehicleTrip_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FuelLog" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "factoryId" TEXT,
    "vehicleId" TEXT,
    "machineId" TEXT,
    "logDate" TIMESTAMP(3) NOT NULL,
    "fuelType" TEXT NOT NULL DEFAULT 'DIESEL',
    "quantityLiters" DECIMAL(18,2) NOT NULL,
    "ratePerLiter" DECIMAL(18,2) NOT NULL,
    "totalCost" DECIMAL(18,2) NOT NULL,
    "odometerReading" DECIMAL(18,2),
    "fillingStation" TEXT,
    "invoiceOrSlipNumber" TEXT,
    "driverOrOperator" TEXT,
    "remarks" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FuelLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VehicleMaintenance" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "vehicleId" TEXT NOT NULL,
    "maintenanceType" TEXT NOT NULL DEFAULT 'SERVICING',
    "serviceDate" TIMESTAMP(3) NOT NULL,
    "odometerReading" DECIMAL(18,2),
    "cost" DECIMAL(18,2) NOT NULL,
    "serviceCenter" TEXT,
    "description" TEXT,
    "nextServiceDueKm" DECIMAL(18,2),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "VehicleMaintenance_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "VehicleTrip_companyId_tripNumber_key" ON "VehicleTrip"("companyId", "tripNumber");
CREATE INDEX "VehicleTrip_companyId_vehicleId_tripDate_idx" ON "VehicleTrip"("companyId", "vehicleId", "tripDate");

-- CreateIndex
CREATE INDEX "FuelLog_companyId_vehicleId_logDate_idx" ON "FuelLog"("companyId", "vehicleId", "logDate");
CREATE INDEX "FuelLog_companyId_machineId_logDate_idx" ON "FuelLog"("companyId", "machineId", "logDate");

-- CreateIndex
CREATE INDEX "VehicleMaintenance_companyId_vehicleId_serviceDate_idx" ON "VehicleMaintenance"("companyId", "vehicleId", "serviceDate");

-- AddForeignKey
ALTER TABLE "VehicleTrip" ADD CONSTRAINT "VehicleTrip_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "VehicleTrip" ADD CONSTRAINT "VehicleTrip_companyId_vehicleId_fkey" FOREIGN KEY ("companyId", "vehicleId") REFERENCES "Vehicle"("companyId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FuelLog" ADD CONSTRAINT "FuelLog_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "FuelLog" ADD CONSTRAINT "FuelLog_companyId_vehicleId_fkey" FOREIGN KEY ("companyId", "vehicleId") REFERENCES "Vehicle"("companyId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VehicleMaintenance" ADD CONSTRAINT "VehicleMaintenance_companyId_vehicleId_fkey" FOREIGN KEY ("companyId", "vehicleId") REFERENCES "Vehicle"("companyId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

