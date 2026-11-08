CREATE TYPE "AuthChallengePurpose" AS ENUM ('PASSWORD_RESET', 'EMAIL_VERIFICATION', 'OTP_LOGIN');

CREATE TABLE "AuthChallenge" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "purpose" "AuthChallengePurpose" NOT NULL,
    "secretHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "consumedAt" TIMESTAMP(3),
    "failedAttempts" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AuthChallenge_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "AuthChallenge_userId_purpose_expiresAt_idx" ON "AuthChallenge"("userId", "purpose", "expiresAt");
CREATE INDEX "AuthChallenge_purpose_secretHash_idx" ON "AuthChallenge"("purpose", "secretHash");

ALTER TABLE "AuthChallenge" ADD CONSTRAINT "AuthChallenge_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
