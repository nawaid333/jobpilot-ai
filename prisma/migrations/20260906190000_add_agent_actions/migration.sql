CREATE TABLE "AgentAction" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "applicationId" TEXT,
  "signalId" TEXT,
  "actionKey" TEXT NOT NULL,
  "type" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "reason" TEXT NOT NULL,
  "priority" INTEGER NOT NULL DEFAULT 0,
  "status" TEXT NOT NULL DEFAULT 'pending',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "AgentAction_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "AgentAction_userId_actionKey_key" ON "AgentAction"("userId", "actionKey");
CREATE INDEX "AgentAction_userId_status_priority_idx" ON "AgentAction"("userId", "status", "priority");
CREATE INDEX "AgentAction_applicationId_status_idx" ON "AgentAction"("applicationId", "status");

ALTER TABLE "AgentAction" ADD CONSTRAINT "AgentAction_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AgentAction" ADD CONSTRAINT "AgentAction_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "Application"("id") ON DELETE CASCADE ON UPDATE CASCADE;
