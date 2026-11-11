-- CreateEnum
CREATE TYPE "AiDomain" AS ENUM (
  'DEMAND_FORECASTING',
  'RICE_PRICE_PREDICTION',
  'PADDY_PRICE_PREDICTION',
  'PRODUCTION_FORECAST',
  'PROFIT_FORECAST',
  'SUPPLIER_QUALITY_SCORE',
  'CUSTOMER_RISK_SCORE',
  'ANOMALY_DETECTION',
  'STOCK_PREDICTION'
);

-- CreateEnum
CREATE TYPE "AiModelStatus" AS ENUM ('REGISTERED', 'TRAINING', 'ACTIVE', 'DEPRECATED');

-- CreateTable
CREATE TABLE "AiModelRegistry" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "domain" "AiDomain" NOT NULL,
    "modelName" TEXT NOT NULL,
    "version" TEXT NOT NULL,
    "framework" TEXT NOT NULL DEFAULT 'ONNX',
    "status" "AiModelStatus" NOT NULL DEFAULT 'REGISTERED',
    "endpointUrl" TEXT,
    "artifactUri" TEXT,
    "inputSchema" JSONB NOT NULL DEFAULT '{}',
    "outputSchema" JSONB NOT NULL DEFAULT '{}',
    "performanceMetric" JSONB NOT NULL DEFAULT '{}',
    "isActive" BOOLEAN NOT NULL DEFAULT false,
    "deployedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AiModelRegistry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AiPredictionLog" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "modelId" TEXT,
    "domain" "AiDomain" NOT NULL,
    "inputFeatures" JSONB NOT NULL,
    "predictionOutput" JSONB,
    "confidenceScore" DECIMAL(5,4),
    "latencyMs" INTEGER,
    "feedbackActual" JSONB,
    "wasAccurate" BOOLEAN,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AiPredictionLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AiFeatureDataset" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "domain" "AiDomain" NOT NULL,
    "datasetName" TEXT NOT NULL,
    "recordCount" INTEGER NOT NULL DEFAULT 0,
    "featureSchema" JSONB NOT NULL DEFAULT '{}',
    "storageKey" TEXT,
    "dataSnapshot" JSONB,
    "exportedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AiFeatureDataset_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "AiModelRegistry_companyId_domain_version_key" ON "AiModelRegistry"("companyId", "domain", "version");

-- CreateIndex
CREATE INDEX "AiModelRegistry_companyId_domain_isActive_idx" ON "AiModelRegistry"("companyId", "domain", "isActive");

-- CreateIndex
CREATE INDEX "AiPredictionLog_companyId_domain_createdAt_idx" ON "AiPredictionLog"("companyId", "domain", "createdAt");

-- CreateIndex
CREATE INDEX "AiFeatureDataset_companyId_domain_createdAt_idx" ON "AiFeatureDataset"("companyId", "domain", "createdAt");

-- AddForeignKey
ALTER TABLE "AiModelRegistry" ADD CONSTRAINT "AiModelRegistry_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AiPredictionLog" ADD CONSTRAINT "AiPredictionLog_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AiPredictionLog" ADD CONSTRAINT "AiPredictionLog_modelId_fkey" FOREIGN KEY ("modelId") REFERENCES "AiModelRegistry"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AiFeatureDataset" ADD CONSTRAINT "AiFeatureDataset_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

