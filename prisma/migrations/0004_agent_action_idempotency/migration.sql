-- Add a nullable unique request key so retried Agent actions can be recognized safely.
ALTER TABLE "AgentAction" ADD COLUMN "idempotencyKey" TEXT;

CREATE UNIQUE INDEX "AgentAction_idempotencyKey_key" ON "AgentAction"("idempotencyKey");
