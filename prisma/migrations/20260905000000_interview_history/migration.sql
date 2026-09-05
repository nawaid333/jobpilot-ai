CREATE TABLE "InterviewSession" (
  "id" TEXT NOT NULL,
  "applicationId" TEXT NOT NULL,
  "question" TEXT NOT NULL,
  "answer" TEXT NOT NULL,
  "feedback" JSONB NOT NULL,
  "mode" TEXT NOT NULL,
  "score" INTEGER,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "InterviewSession_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "InterviewSession_applicationId_createdAt_idx" ON "InterviewSession"("applicationId", "createdAt");

ALTER TABLE "InterviewSession"
ADD CONSTRAINT "InterviewSession_applicationId_fkey"
FOREIGN KEY ("applicationId") REFERENCES "Application"("id") ON DELETE CASCADE ON UPDATE CASCADE;
