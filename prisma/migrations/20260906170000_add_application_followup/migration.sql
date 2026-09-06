ALTER TABLE "Application"
  ADD COLUMN "lastActivityAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  ADD COLUMN "nextActionAt" TIMESTAMP(3);

CREATE INDEX "Application_userId_nextActionAt_idx" ON "Application"("userId", "nextActionAt");
