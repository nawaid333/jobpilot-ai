-- Indexes supporting bounded retention and cleanup queries.
CREATE INDEX "Job_lastSeenAt_idx" ON "Job"("lastSeenAt");
CREATE INDEX "Application_userId_followUpDueAt_idx" ON "Application"("userId", "followUpDueAt");
CREATE INDEX "EmailSignal_userId_createdAt_idx" ON "EmailSignal"("userId", "createdAt");
CREATE INDEX "AiUsage_month_idx" ON "AiUsage"("month");
