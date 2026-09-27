import test from "node:test";
import assert from "node:assert/strict";

function dailyBrief(actions, limit = 3) {
  return [...actions].sort((a, b) => b.priority - a.priority || ((a.dueAt ? new Date(a.dueAt).getTime() : Infinity) - (b.dueAt ? new Date(b.dueAt).getTime() : Infinity))).slice(0, Math.max(0, limit));
}

test("Agent daily brief preserves actionable queue fields", () => {
  const actions = [
    { id: "followup-1", type: "follow-up", priority: 5, title: "Overdue follow-up", company: "Acme", reason: "Recruiter context needs review.", applicationId: "app-1", dueAt: "2026-09-13T12:00:00Z" },
    { id: "interview-1", type: "interview", priority: 5, title: "Prepare for interview", company: "Globex", reason: "Interview is scheduled.", applicationId: "app-2" },
    { id: "tailor-1", type: "tailor", priority: 2, title: "Tailor application", company: "Initech", reason: "No tailored package exists.", applicationId: "app-3" },
  ];
  const brief = dailyBrief(actions);
  assert.equal(brief.length, 3);
  assert.equal(brief[0].type, "follow-up");
  assert.equal(brief[0].applicationId, "app-1");
  assert.equal(brief[1].type, "interview");
  assert.equal(brief[2].type, "tailor");
  assert.ok(brief.every(action => action.company && action.reason));
});
