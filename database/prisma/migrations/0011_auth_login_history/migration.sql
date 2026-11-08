CREATE TYPE "AuthLoginResult" AS ENUM ('SUCCESS', 'FAILED', 'LOCKED');

CREATE TABLE "AuthLoginEvent" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "result" "AuthLoginResult" NOT NULL,
    "deviceName" TEXT,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuthLoginEvent_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "AuthLoginEvent_userId_createdAt_idx" ON "AuthLoginEvent"("userId", "createdAt");

ALTER TABLE "AuthLoginEvent" ADD CONSTRAINT "AuthLoginEvent_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
