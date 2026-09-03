import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import test, { after } from "node:test";
import { PrismaClient } from "@prisma/client";

const baseUrl = (process.env.BASE_URL || "http://127.0.0.1:3000").replace(/\/$/, "");
const prisma = new PrismaClient();
const runId = randomUUID().replaceAll("-", "");
const users = {
  a: { email: `qa-a-${runId}@example.test`, password: "JobPilotQA!123", name: "QA A" },
  b: { email: `qa-b-${runId}@example.test`, password: "JobPilotQA!123", name: "QA B" },
};
let userA;
let userB;
let cookieA;
let cookieB;
let applicationId;
let jobId;

async function request(path, options = {}) {
  const response = await fetch(`${baseUrl}${path}`, {
    redirect: "manual",
    ...options,
    headers: { ...(options.headers || {}) },
  });
  let body = null;
  const text = await response.text();
  if (text) {
    try { body = JSON.parse(text); } catch { body = text; }
  }
  return { response, body };
}

function sessionCookie(response) {
  const raw = response.headers.get("set-cookie") || "";
  const match = raw.match(/jobpilot-session=([^;]+)/);
  assert.ok(match, "Expected session cookie");
  return `jobpilot-session=${match[1]}`;
}

async function signup(user) {
  const { response, body } = await request("/api/auth/signup", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(user),
  });
  assert.equal(response.status, 201, JSON.stringify(body));
  assert.ok(body?.user?.id);
  return { id: body.user.id, cookie: sessionCookie(response) };
}

after(async () => {
  try {
    if (userA?.id) await prisma.user.delete({ where: { id: userA.id } });
    if (userB?.id) await prisma.user.delete({ where: { id: userB.id } });
    if (jobId) await prisma.job.delete({ where: { id: jobId } }).catch(() => undefined);
  } finally {
    await prisma.$disconnect();
  }
});

test("protected APIs reject unauthenticated requests", async () => {
  const { response, body } = await request("/api/applications");
  assert.equal(response.status, 401);
  assert.equal(body?.error, "Unauthorized");
});

test("security headers are present", async () => {
  const { response } = await request("/api/applications");
  assert.equal(response.headers.get("x-content-type-options"), "nosniff");
  assert.equal(response.headers.get("x-frame-options"), "DENY");
  assert.equal(response.headers.get("referrer-policy"), "strict-origin-when-cross-origin");
  assert.equal(response.headers.get("permissions-policy"), "camera=(), microphone=(), geolocation=()");
});

test("signup rejects malformed input", async () => {
  const { response } = await request("/api/auth/signup", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ email: "not-an-email", password: "short" }),
  });
  assert.equal(response.status, 400);
});

test("invalid JSON returns 400 instead of 500", async () => {
  const { response } = await request("/api/auth/login", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: "{broken-json",
  });
  assert.equal(response.status, 400);
});

test("two users get isolated application data", async () => {
  userA = await signup(users.a);
  userB = await signup(users.b);
  cookieA = userA.cookie;
  cookieB = userB.cookie;

  jobId = `qa-security-${runId}`;
  const created = await request("/api/applications", {
    method: "POST",
    headers: { "content-type": "application/json", cookie: cookieA },
    body: JSON.stringify({
      job: {
        id: jobId,
        title: "Security QA Engineer",
        company: "JobPilot QA",
        location: "Remote",
        mode: "Remote",
        level: "Mid level",
        source: "QA",
        description: "Synthetic security regression job.",
        skills: ["Testing"],
        url: "https://example.com/jobs/qa",
      },
      status: "Saved",
    }),
  });
  assert.equal(created.response.status, 200, JSON.stringify(created.body));
  applicationId = created.body?.application?.id;
  assert.ok(applicationId);

  const own = await request("/api/applications", { headers: { cookie: cookieA } });
  assert.equal(own.response.status, 200);
  assert.ok(own.body.applications.some((item) => item.id === applicationId));

  const other = await request("/api/applications", { headers: { cookie: cookieB } });
  assert.equal(other.response.status, 200);
  assert.equal(other.body.applications.some((item) => item.id === applicationId), false);

  const patch = await request("/api/applications", {
    method: "PATCH",
    headers: { "content-type": "application/json", cookie: cookieB },
    body: JSON.stringify({ id: applicationId, status: "Applied" }),
  });
  assert.equal(patch.response.status, 404);

  const deletion = await request("/api/applications", {
    method: "DELETE",
    headers: { "content-type": "application/json", cookie: cookieB },
    body: JSON.stringify({ id: applicationId }),
  });
  assert.equal(deletion.response.status, 404);

  const stillOwn = await request("/api/applications", { headers: { cookie: cookieA } });
  assert.ok(stillOwn.body.applications.some((item) => item.id === applicationId));
});

test("state-changing requests reject an unexpected origin", async () => {
  const { response } = await request("/api/applications", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      origin: "https://attacker.example",
      cookie: cookieA,
    },
    body: JSON.stringify({ job: { id: `blocked-${runId}`, title: "Blocked", company: "Blocked", location: "Remote" } }),
  });
  assert.equal(response.status, 403);
});

test("expired sessions are rejected", async () => {
  const expired = await prisma.session.create({
    data: { userId: userA.id, expiresAt: new Date(Date.now() - 60_000) },
  });
  const { response, body } = await request("/api/profile", {
    headers: { cookie: `jobpilot-session=${expired.id}` },
  });
  assert.equal(response.status, 401);
  assert.equal(body?.error, "Unauthorized");
  assert.equal(await prisma.session.findUnique({ where: { id: expired.id } }), null);
});

test("application input limits reject oversized bodies", async () => {
  const oversized = JSON.stringify({ job: { id: `large-${runId}`, title: "Large", company: "Large", location: "Remote" }, notes: "x".repeat(130_000) });
  const { response } = await request("/api/applications", {
    method: "POST",
    headers: { "content-type": "application/json", "content-length": String(Buffer.byteLength(oversized)), cookie: cookieA },
    body: oversized,
  });
  assert.equal(response.status, 413);
});
