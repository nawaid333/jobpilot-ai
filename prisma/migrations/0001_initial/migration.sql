-- CreateTable
CREATE TABLE "User" (
  "id" TEXT NOT NULL,
  "email" TEXT NOT NULL,
  "name" TEXT,
  "image" TEXT,
  "passwordHash" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

CREATE TABLE "Session" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Session_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX "Session_userId_idx" ON "Session"("userId");
CREATE INDEX "Session_expiresAt_idx" ON "Session"("expiresAt");

CREATE TABLE "CareerProfile" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "atsScore" INTEGER NOT NULL DEFAULT 0,
  "headline" TEXT,
  "location" TEXT,
  "summary" TEXT NOT NULL DEFAULT '',
  "skills" JSONB NOT NULL,
  "targetRoles" JSONB NOT NULL,
  "experience" JSONB NOT NULL,
  "education" JSONB NOT NULL,
  "strengths" JSONB NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "CareerProfile_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "CareerProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "CareerProfile_userId_key" ON "CareerProfile"("userId");

CREATE TABLE "JobPreferences" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "roles" TEXT NOT NULL DEFAULT '',
  "locations" TEXT NOT NULL DEFAULT '',
  "workMode" TEXT NOT NULL DEFAULT 'Any',
  "seniority" TEXT NOT NULL DEFAULT 'Any',
  "minSalary" TEXT NOT NULL DEFAULT '',
  "keywords" TEXT NOT NULL DEFAULT '',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "JobPreferences_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "JobPreferences_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "JobPreferences_userId_key" ON "JobPreferences"("userId");

CREATE TABLE "Job" (
  "id" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "company" TEXT NOT NULL,
  "location" TEXT NOT NULL,
  "mode" TEXT,
  "level" TEXT,
  "source" TEXT,
  "salary" TEXT,
  "url" TEXT,
  "description" TEXT,
  "skills" JSONB NOT NULL,
  "firstSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "lastSeenAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Job_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Application" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "jobId" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'Saved',
  "notes" TEXT NOT NULL DEFAULT '',
  "appliedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Application_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "Application_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "Application_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "Job"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "Application_userId_jobId_key" ON "Application"("userId", "jobId");
CREATE INDEX "Application_userId_status_idx" ON "Application"("userId", "status");

CREATE TABLE "TailoredApplication" (
  "id" TEXT NOT NULL,
  "applicationId" TEXT NOT NULL,
  "tailoredSummary" TEXT NOT NULL,
  "resumeEdits" JSONB NOT NULL,
  "coverLetter" TEXT NOT NULL,
  "missingRequirements" JSONB NOT NULL,
  "recommendation" TEXT NOT NULL,
  "template" TEXT NOT NULL DEFAULT 'classic',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "TailoredApplication_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "TailoredApplication_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "Application"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "TailoredApplication_applicationId_key" ON "TailoredApplication"("applicationId");

CREATE TABLE "GmailConnection" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "provider" TEXT NOT NULL DEFAULT 'google',
  "email" TEXT,
  "refreshToken" TEXT NOT NULL,
  "scope" TEXT NOT NULL,
  "connectedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "GmailConnection_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "GmailConnection_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "GmailConnection_userId_key" ON "GmailConnection"("userId");

CREATE TABLE "EmailSignal" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "jobId" TEXT,
  "applicationId" TEXT,
  "gmailMessageId" TEXT NOT NULL,
  "threadId" TEXT,
  "sender" TEXT,
  "subject" TEXT,
  "receivedAt" TIMESTAMP(3),
  "category" TEXT NOT NULL,
  "confidence" DOUBLE PRECISION NOT NULL,
  "suggestedStatus" TEXT,
  "reason" TEXT NOT NULL,
  "recruiterName" TEXT,
  "recruiterEmail" TEXT,
  "matchedScore" DOUBLE PRECISION,
  "matchMethod" TEXT,
  "ambiguous" BOOLEAN NOT NULL DEFAULT false,
  "applied" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "EmailSignal_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "EmailSignal_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "EmailSignal_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "Job"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT "EmailSignal_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "Application"("id") ON DELETE SET NULL ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "EmailSignal_userId_gmailMessageId_key" ON "EmailSignal"("userId", "gmailMessageId");
CREATE INDEX "EmailSignal_userId_category_idx" ON "EmailSignal"("userId", "category");
CREATE INDEX "EmailSignal_applicationId_idx" ON "EmailSignal"("applicationId");

CREATE TABLE "Subscription" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "plan" TEXT NOT NULL DEFAULT 'free',
  "status" TEXT NOT NULL DEFAULT 'active',
  "provider" TEXT,
  "providerCustomerId" TEXT,
  "providerSubscriptionId" TEXT,
  "currentPeriodEnd" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Subscription_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "Subscription_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "Subscription_userId_key" ON "Subscription"("userId");

CREATE TABLE "AiUsage" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "month" TEXT NOT NULL,
  "credits" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "AiUsage_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "AiUsage_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "AiUsage_userId_month_key" ON "AiUsage"("userId", "month");
CREATE INDEX "AiUsage_userId_idx" ON "AiUsage"("userId");

INSERT INTO "Job" ("id","title","company","location","mode","level","source","salary","url","description","skills","lastSeenAt") VALUES ('seed-job-1','Software Engineer','JobPilot Demo','Remote','Remote','Mid','demo',NULL,NULL,'Demo job for CI smoke tests','["TypeScript","Next.js"]',CURRENT_TIMESTAMP);
