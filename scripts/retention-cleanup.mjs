import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const BATCH_SIZE = 100;
const EMAIL_SIGNAL_RETENTION_DAYS = 180;
const JOB_RETENTION_DAYS = 365;
const AI_USAGE_RETENTION_MONTHS = 24;

function hasFlag(name) {
  return process.argv.includes(name);
}

function parseBatchSize() {
  const value = process.env.RETENTION_CLEANUP_BATCH_SIZE;
  if (!value) return BATCH_SIZE;
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 1 || parsed > 1000) {
    throw new Error("RETENTION_CLEANUP_BATCH_SIZE must be an integer between 1 and 1000");
  }
  return parsed;
}

function monthKey(date) {
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`;
}

function subtractMonths(date, months) {
  const result = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1));
  result.setUTCMonth(result.getUTCMonth() - months);
  return result;
}

function subtractDays(date, days) {
  return new Date(date.getTime() - days * 24 * 60 * 60 * 1000);
}

function buildCutoffs(now) {
  return {
    sessionExpiresBefore: now,
    emailSignalCreatedBefore: subtractDays(now, EMAIL_SIGNAL_RETENTION_DAYS),
    aiUsageMonthBefore: monthKey(subtractMonths(now, AI_USAGE_RETENTION_MONTHS)),
    jobLastSeenBefore: subtractDays(now, JOB_RETENTION_DAYS),
  };
}

async function collectCandidates(cutoffs, batchSize) {
  const [sessions, emailSignals, aiUsage, jobs] = await Promise.all([
    prisma.session.findMany({
      where: { expiresAt: { lt: cutoffs.sessionExpiresBefore } },
      select: { id: true },
      orderBy: { expiresAt: "asc" },
      take: batchSize,
    }),
    prisma.emailSignal.findMany({
      where: { createdAt: { lt: cutoffs.emailSignalCreatedBefore } },
      select: { id: true },
      orderBy: { createdAt: "asc" },
      take: batchSize,
    }),
    prisma.aiUsage.findMany({
      where: { month: { lt: cutoffs.aiUsageMonthBefore } },
      select: { id: true },
      orderBy: { month: "asc" },
      take: batchSize,
    }),
    prisma.job.findMany({
      where: {
        lastSeenAt: { lt: cutoffs.jobLastSeenBefore },
        applications: { none: {} },
      },
      select: { id: true },
      orderBy: { lastSeenAt: "asc" },
      take: batchSize,
    }),
  ]);

  return {
    sessions: sessions.map(({ id }) => id),
    emailSignals: emailSignals.map(({ id }) => id),
    aiUsage: aiUsage.map(({ id }) => id),
    jobs: jobs.map(({ id }) => id),
  };
}

async function deleteCandidates(candidates, cutoffs) {
  const [sessions, emailSignals, aiUsage, jobs] = await prisma.$transaction([
    prisma.session.deleteMany({
      where: { id: { in: candidates.sessions }, expiresAt: { lt: cutoffs.sessionExpiresBefore } },
    }),
    prisma.emailSignal.deleteMany({
      where: { id: { in: candidates.emailSignals }, createdAt: { lt: cutoffs.emailSignalCreatedBefore } },
    }),
    prisma.aiUsage.deleteMany({
      where: { id: { in: candidates.aiUsage }, month: { lt: cutoffs.aiUsageMonthBefore } },
    }),
    prisma.job.deleteMany({
      where: {
        id: { in: candidates.jobs },
        lastSeenAt: { lt: cutoffs.jobLastSeenBefore },
        applications: { none: {} },
      },
    }),
  ]);

  return {
    sessions: sessions.count,
    emailSignals: emailSignals.count,
    aiUsage: aiUsage.count,
    jobs: jobs.count,
  };
}

function assertExecutionIsEnabled() {
  if (process.env.RETENTION_CLEANUP_ENABLED !== "true") {
    throw new Error("Refusing destructive cleanup: RETENTION_CLEANUP_ENABLED must be true");
  }
  if (!process.env.RETENTION_CLEANUP_TOKEN) {
    throw new Error("Refusing destructive cleanup: RETENTION_CLEANUP_TOKEN is required");
  }
  if (process.env.RETENTION_CLEANUP_TOKEN !== process.env.RETENTION_CLEANUP_EXPECTED_TOKEN) {
    throw new Error("Refusing destructive cleanup: RETENTION_CLEANUP_TOKEN does not match the protected maintenance credential");
  }
}

async function main() {
  const batchSize = parseBatchSize();
  const now = new Date();
  const cutoffs = buildCutoffs(now);
  const candidates = await collectCandidates(cutoffs, batchSize);
  const dryRun = !hasFlag("--execute");

  if (!dryRun) assertExecutionIsEnabled();

  const result = dryRun
    ? {
        sessions: candidates.sessions.length,
        emailSignals: candidates.emailSignals.length,
        aiUsage: candidates.aiUsage.length,
        jobs: candidates.jobs.length,
      }
    : await deleteCandidates(candidates, cutoffs);

  console.log(JSON.stringify({
    mode: dryRun ? "dry-run" : "execute",
    batchSize,
    cutoffs: {
      sessionExpiresBefore: cutoffs.sessionExpiresBefore.toISOString(),
      emailSignalCreatedBefore: cutoffs.emailSignalCreatedBefore.toISOString(),
      aiUsageMonthBefore: cutoffs.aiUsageMonthBefore,
      jobLastSeenBefore: cutoffs.jobLastSeenBefore.toISOString(),
    },
    result,
  }, null, 2));
}

try {
  await main();
} finally {
  await prisma.$disconnect();
}
