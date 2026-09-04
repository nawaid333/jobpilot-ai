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
  const response = await fetch(`${baseUrl}${path}`, {
    redirect: "manual",
    ...options,
    headers: { ...(options.headers || {}) },
  });
  const text = await response.text();
  let body = null;
  if (text) {
    try { body = JSON.parse(text); } catch { body = text; }
  }
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
  const { response, body } = await request("/api/auth/signup", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      email: `status-qa-${runId}@example.test`,
      password: "JobPilotQA!123",
      name: "Status QA",
    }),
  });
  assert.equal(response.status, 201, JSON.stringify(body));
  userId = body.user.id;
  cookie = sessionCookie(response);
});

after(async () => {
  try {
    if (userId) await prisma.user.delete({ where: { id: userId } });
  } finally {
    await prisma.$disconnect();
  }
});

test("Applied status gets an appliedAt timestamp and preserves it", async () => {
  const jobId = `status-regression-${runId}`;
  const created = await request("/api/applications", {
    method: "POST",
    headers: { "content-type": "application/json", cookie },
    body: JSON.stringify({
      job: { id: jobId, title: "Status Regression QA", company: "JobPilot QA", location: "Remote" },
      status: "Saved",
    }),
  });
  assert.equal(created.response.status, 200, JSON.stringify(created.body));
  applicationId = created.body.application.id;
  assert.equal(created.body.application.appliedAt, null);

  const applied = await request("/api/applications", {
    method: "PATCH",
    headers: { "content-type": "application/json", cookie },
    body: JSON.stringify({ id: applicationId, status: "Applied" }),
  });
  assert.equal(applied.response.status, 200, JSON.stringify(applied.body));
  assert.ok(applied.body.application.appliedAt, "Applied status must record appliedAt");
  const appliedAt = applied.body.application.appliedAt;

  const updated = await request("/api/applications", {
    method: "PATCH",
    headers: { "content-type": "application/json", cookie },
    body: JSON.stringify({ id: applicationId, notes: "Recruiter follow-up" }),
  });
  assert.equal(updated.response.status, 200, JSON.stringify(updated.body));
  assert.equal(updated.body.application.appliedAt, appliedAt, "Updating notes must not reset appliedAt");
});
