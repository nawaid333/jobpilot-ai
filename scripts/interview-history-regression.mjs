import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import test, { after, before } from "node:test";
import { PrismaClient } from "@prisma/client";

const baseUrl = (process.env.BASE_URL || "http://127.0.0.1:3000").replace(/\/$/, "");
const prisma = new PrismaClient();
const runId = randomUUID().replaceAll("-", "");
let userId;
let cookie;
let applicationId;
let otherUserId;
let otherCookie;
let otherApplicationId;

async function request(path, options = {}) {
  const response = await fetch(`${baseUrl}${path}`, { redirect: "manual", ...options, headers: { ...(options.headers || {}) } });
  const text = await response.text();
  let body = null;
  if (text) { try { body = JSON.parse(text); } catch { body = text; } }
  return { response, body };
}

function sessionCookie(response) {
  const values = response.headers.getSetCookie?.() || [response.headers.get("set-cookie") || ""];
  const match = values.join(",").match(/(?:^|,)\s*jobpilot-session=([^;]+)/);
  assert.ok(match, "Expected jobpilot session cookie");
  return `jobpilot-session=${match[1]}`;
}

async function signup(prefix) {
  const { response, body } = await request("/api/auth/signup", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ email: `${prefix}-${runId}@example.test`, password: "JobPilotQA!123", name: "Interview QA" }) });
  assert.equal(response.status, 201, JSON.stringify(body));
  return { id: body.user.id, cookie: sessionCookie(response) };
}

before(async () => {
  ({ id: userId, cookie } = await signup("interview-history-qa"));
  ({ id: otherUserId, cookie: otherCookie } = await signup("interview-history-other"));
  const first = await request("/api/applications", { method: "POST", headers: { "content-type": "application/json", cookie }, body: JSON.stringify({ job: { id: `interview-history-job-${runId}`, title: "Interview History QA", company: "JobPilot QA", location: "Remote" }, status: "Saved" }) });
  assert.equal(first.response.status, 200, JSON.stringify(first.body));
  applicationId = first.body.application.id;
  const second = await request("/api/applications", { method: "POST", headers: { "content-type": "application/json", cookie: otherCookie }, body: JSON.stringify({ job: { id: `interview-history-other-job-${runId}`, title: "Other User QA", company: "JobPilot QA", location: "Remote" }, status: "Saved" }) });
  assert.equal(second.response.status, 200, JSON.stringify(second.body));
  otherApplicationId = second.body.application.id;
  await prisma.interviewSession.createMany({ data: Array.from({ length: 3 }, (_, i) => ({ applicationId, question: `Question ${i + 1}`, answer: `Answer ${i + 1}`, feedback: { score: 70 + i, verdict: `Verdict ${i + 1}` }, mode: "ai", score: 70 + i })) });
  await prisma.interviewSession.create({ data: { applicationId: otherApplicationId, question: "Private question", answer: "Private answer", feedback: { score: 99 }, mode: "ai", score: 99 } });
});

after(async () => { try { if (userId) await prisma.user.delete({ where: { id: userId } }); if (otherUserId) await prisma.user.delete({ where: { id: otherUserId } }); } finally { await prisma.$disconnect(); } });

test("interview history requires authentication", async () => {
  const result = await request(`/api/interview?applicationId=${encodeURIComponent(applicationId)}`);
  assert.equal(result.response.status, 401);
});

test("interview history enforces application ownership", async () => {
  const result = await request(`/api/interview?applicationId=${encodeURIComponent(applicationId)}`, { headers: { cookie: otherCookie } });
  assert.equal(result.response.status, 404);
});

test("interview history validates limit and returns summary", async () => {
  for (const limit of ["0", "51", "1.5", "abc"]) {
    const invalid = await request(`/api/interview?applicationId=${encodeURIComponent(applicationId)}&limit=${limit}`, { headers: { cookie } });
    assert.equal(invalid.response.status, 400, `Expected invalid limit ${limit} to be rejected`);
  }
  const result = await request(`/api/interview?applicationId=${encodeURIComponent(applicationId)}&limit=2`, { headers: { cookie } });
  assert.equal(result.response.status, 200, JSON.stringify(result.body));
  assert.equal(result.body.sessions.length, 2);
  assert.equal(result.body.summary.attempts, 2);
  assert.equal(result.body.summary.scoredAttempts, 2);
  assert.equal(result.body.summary.averageScore, 72);
  assert.ok(result.body.summary.latestPracticeAt);
});

test("interview history does not leak another application's sessions", async () => {
  const result = await request(`/api/interview?applicationId=${encodeURIComponent(otherApplicationId)}`, { headers: { cookie } });
  assert.equal(result.response.status, 404);
});
