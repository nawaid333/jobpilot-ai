const test = require("node:test");
const assert = require("node:assert/strict");

const allowed = new Set(["apply", "consider", "skip"]);

function validateTailoring(result) {
  assert.equal(typeof result.fitSummary, "string");
  assert.equal(typeof result.tailoredSummary, "string");
  assert.ok(Array.isArray(result.resumeEdits));
  for (const edit of result.resumeEdits) {
    assert.equal(typeof edit.section, "string");
    assert.equal(typeof edit.original, "string");
    assert.equal(typeof edit.suggested, "string");
    assert.equal(typeof edit.reason, "string");
  }
  assert.equal(typeof result.coverLetter, "string");
  assert.ok(Array.isArray(result.missingRequirements));
  assert.ok(result.missingRequirements.every(x => typeof x === "string"));
  assert.ok(allowed.has(result.applicationRecommendation));
}

test("accepts a valid truthful tailoring package", () => {
  validateTailoring({
    fitSummary: "Strong match for the listed responsibilities.",
    tailoredSummary: "Operations professional with relevant experience.",
    resumeEdits: [{ section: "Summary", original: "Operations professional.", suggested: "Operations professional with workforce coordination experience.", reason: "Reframes an existing profile fact." }],
    coverLetter: "Dear Hiring Team, I am interested in this role.",
    missingRequirements: ["Specific certification not present in profile"],
    applicationRecommendation: "apply",
  });
});

test("rejects unsupported recommendation values", () => {
  assert.equal(allowed.has("maybe"), false);
  assert.equal(allowed.has("apply"), true);
});

test("requires every resume edit to have an evidence reason", () => {
  assert.throws(() => validateTailoring({
    fitSummary: "fit",
    tailoredSummary: "summary",
    resumeEdits: [{ section: "Experience", original: "x", suggested: "y" }],
    coverLetter: "letter",
    missingRequirements: [],
    applicationRecommendation: "consider",
  }));
});
