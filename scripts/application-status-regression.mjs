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

async function request(path, options = {}) {
  const response = await fetch(`${baseUrl}${path}`, { redirect: "manual", ...options, headers: { ...(options.headers || {}) } });
  const text = await response.text();
  let body = null;
  if (text) { try { body = JSON.parse(text); } catch { body = text; } }
  return { response, body };
}

function sessionCookie(response) {
  const getSetCookie = response.headers.getSetCookie?.bind(response.headers);
  const values = getSetCookie ? getSetCookie() : [response.headers.get("set-cookie") || ""];
  const match = values.join(",").match(/(?:^|,)\s*jobpilot-session=([^;]+)/);
  assert.ok(match, "Expected jobpilot session cookie");
  return `jobpilot-session=${match[1]}`;
}

before(async () => {
  const { response, body } = await request("/api/auth/signup", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ email: `status-qa-${runId}@example.test`, password: "JobPilotQA!123", name: "Status QA" }) });
  assert.equal(response.status, 201, JSON.stringify(body));
  userId = body.user.id;
  cookie = sessionCookie(response);
});

after(async () => { try { if (userId) await prisma.user.delete({ where: { id: userId } }); } finally { await prisma.$disconnect(); } });

async function createApplication(jobId, status = "Saved") {
  return request("/api/applications", { method: "POST", headers: { "content-type": "application/json", cookie }, body: JSON.stringify({ job: { id: jobId, title: "Status Regression QA", company: "JobPilot QA", location: "Remote" }, status }) });
}

test("Applied status gets an appliedAt timestamp and preserves it", async () => {
  const created = await createApplication(`status-regression-${runId}`);
  assert.equal(created.response.status, 200, JSON.stringify(created.body));
  applicationId = created.body.application.id;
  assert.equal(created.body.application.appliedAt, null);
  const applied = await request("/api/applications", { method: "PATCH", headers: { "content-type": "application/json", cookie }, body: JSON.stringify({ id: applicationId, status: "Applied" }) });
  assert.equal(applied.response.status, 200, JSON.stringify(applied.body));
  assert.ok(applied.body.application.appliedAt, "Applied status must record appliedAt");
  const appliedAt = applied.body.application.appliedAt;
  const updated = await request("/api/applications", { method: "PATCH", headers: { "content-type": "application/json", cookie }, body: JSON.stringify({ id: applicationId, notes: "Recruiter follow-up" }) });
  assert.equal(updated.response.status, 200, JSON.stringify(updated.body));
  assert.equal(updated.body.application.appliedAt, appliedAt, "Updating notes must not reset appliedAt");
});

test("duplicate job applications are idempotent", async () => {
  const jobId = `duplicate-regression-${runId}`;
  const first = await createApplication(jobId);
  assert.equal(first.response.status, 200, JSON.stringify(first.body));
  const second = await createApplication(jobId);
  assert.equal(second.response.status, 200, JSON.stringify(second.body));
  assert.equal(second.body?.application?.id, first.body.application.id, "Duplicate submission must return the existing application");
  const applications = await request("/api/applications", { headers: { cookie } });
  assert.equal(applications.response.status, 200);
  assert.equal(applications.body.applications.filter((item) => item.id === first.body.application.id).length, 1, "Duplicate submission must not create a second application");
});

test("invalid status transitions are rejected", async () => {
  const created = await createApplication(`transition-regression-${runId}`);
  assert.equal(created.response.status, 200, JSON.stringify(created.body));
  const id = created.body.application.id;
  for (const status of ["Bogus", "applied", "INTERVIEW", "deleted"]) {
    const result = await request("/api/applications", { method: "PATCH", headers: { "content-type": "application/json", cookie }, body: JSON.stringify({ id, status }) });
    assert.equal(result.response.status, 400, `Expected invalid status ${status} to be rejected`);
  }
});

test("status transitions cannot move backward", async () => {
  const created = await createApplication(`backward-transition-regression-${runId}`);
  assert.equal(created.response.status, 200, JSON.stringify(created.body));
  const id = created.body.application.id;
  const interview = await request("/api/applications", { method: "PATCH", headers: { "content-type": "application/json", cookie }, body: JSON.stringify({ id, status: "Interview" }) });
  assert.equal(interview.response.status, 200, JSON.stringify(interview.body));
  for (const status of ["Applied", "Preparing", "Saved"]) {
    const result = await request("/api/applications", { method: "PATCH", headers: { "content-type": "application/json", cookie }, body: JSON.stringify({ id, status }) });
    assert.equal(result.response.status, 409, `Expected backward transition to ${status} to be rejected`);
    assert.equal(result.body?.error, "Application status cannot move backwards.");
  }
  const unchanged = await request("/api/applications", { headers: { cookie } });
  assert.equal(unchanged.response.status, 200);
  assert.equal(unchanged.body.applications.find((item) => item.id === id)?.status, "Interview", "Rejected backward transition must preserve the current status");
});

test("new applications reject terminal or interview-only initial states", async () => {
  for (const status of ["Interview", "Offer", "Rejected"]) {
    const result = await createApplication(`invalid-initial-${status.toLowerCase()}-${runId}`, status);
    assert.equal(result.response.status, 400, `Expected initial status ${status} to be rejected`);
    assert.equal(result.body?.error, "New applications may start only at Saved, Preparing, or Applied.");
  }
});
