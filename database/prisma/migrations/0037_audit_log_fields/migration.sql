-- AlterTable
ALTER TABLE "AuditEvent" ADD COLUMN "userName" TEXT;
ALTER TABLE "AuditEvent" ADD COLUMN "ipAddress" TEXT;
ALTER TABLE "AuditEvent" ADD COLUMN "device" TEXT;

-- CreateIndex
CREATE INDEX "AuditEvent_companyId_action_idx" ON "AuditEvent"("companyId", "action");

