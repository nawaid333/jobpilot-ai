import test from "node:test";
import assert from "node:assert/strict";
import { buildProactiveInsights } from "../src/lib/proactive-intelligence.ts";

const now = new Date("2026-09-27T10:00:00.000Z");
const job = { title: "Project Coordinator", company: "Example Co" };

function app(overrides = {}) {
  return {
    id: "app-1",
    status: "Applied",
    appliedAt: new Date("2026-09-17T10:00:00.000Z"),
    updatedAt: new Date("2026-09-17T10:00:00.000Z"),
    followUpDueAt: null,
    tailoredApplication: { id: "tailored-1" },
    job,
    ...overrides,
  };
}

test("flags applied applications with no recent signal", () => {
  const insights = buildProactiveInsights([app()], [], now);
  assert.equal(insights.some((i) => i.type === "stale-application"), true);
  assert.match(insights.find((i) => i.type === "stale-application").reason, /10 days/);
});

test("does not flag a fresh recruiter signal as stale", () => {
  const insights = buildProactiveInsights(
    [app()],
    [{ id: "sig-1", applicationId: "app-1", category: "confirmation", applied: false, reason: "Application received", receivedAt: new Date("2026-09-25T10:00:00.000Z") }],
    now
  );
  assert.equal(insights.some((i) => i.type === "stale-application"), false);
});

test("prioritizes overdue follow-up", () => {
  const insights = buildProactiveInsights([app({ followUpDueAt: new Date("2026-09-25T10:00:00.000Z") })], [], now);
  assert.equal(insights[0].type, "follow-up-due");
  assert.equal(insights[0].priority, 5);
});

test("surfaces unapproved interview signal with evidence", () => {
  const insights = buildProactiveInsights(
    [app()],
    [{ id: "sig-2", applicationId: "app-1", category: "interview", applied: false, reason: "Interview invitation received", receivedAt: new Date("2026-09-26T10:00:00.000Z") }],
    now
  );
  const insight = insights.find((i) => i.type === "recruiter-signal");
  assert.ok(insight);
  assert.equal(insight.evidence.includes("Tracker update still requires your approval"), true);
});

test("flags interview preparation", () => {
  const insights = buildProactiveInsights([app({ status: "Interview" })], [], now);
  assert.equal(insights.some((i) => i.type === "interview-prep"), true);
});

test("flags missing tailoring for saved applications", () => {
  const insights = buildProactiveInsights([app({ status: "Saved", appliedAt: null, tailoredApplication: null })], [], now);
  assert.equal(insights.some((i) => i.type === "tailor-needed"), true);
});
