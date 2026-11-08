CREATE TABLE "GateAttachment" (
  "id" TEXT NOT NULL,
  "companyId" TEXT NOT NULL,
  "factoryId" TEXT NOT NULL,
  "gateEntryId" TEXT NOT NULL,
  "fileName" TEXT NOT NULL,
  "storageKey" TEXT NOT NULL,
  "mimeType" TEXT NOT NULL,
  "sizeBytes" INTEGER NOT NULL,
  "uploadedById" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "GateAttachment_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "GateAttachment_storageKey_key" ON "GateAttachment"("storageKey");
CREATE INDEX "GateAttachment_companyId_factoryId_gateEntryId_createdAt_idx"
  ON "GateAttachment"("companyId", "factoryId", "gateEntryId", "createdAt");

ALTER TABLE "GateAttachment"
  ADD CONSTRAINT "GateAttachment_companyId_fkey"
  FOREIGN KEY ("companyId") REFERENCES "Company"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "GateAttachment"
  ADD CONSTRAINT "GateAttachment_companyId_factoryId_fkey"
  FOREIGN KEY ("companyId", "factoryId") REFERENCES "Factory"("companyId", "id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "GateAttachment"
  ADD CONSTRAINT "GateAttachment_companyId_factoryId_gateEntryId_fkey"
  FOREIGN KEY ("companyId", "factoryId", "gateEntryId") REFERENCES "GateEntry"("companyId", "factoryId", "id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "GateAttachment"
  ADD CONSTRAINT "GateAttachment_uploadedById_fkey"
  FOREIGN KEY ("uploadedById") REFERENCES "User"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;
