const test = require("node:test");
const assert = require("node:assert/strict");

const allowed = new Set(["apply", "consider", "skip"]);

function isValidPackage(value) {
  if (!value || typeof value !== "object") return false;
  if (typeof value.fitSummary !== "string" || typeof value.tailoredSummary !== "string") return false;
  if (!Array.isArray(value.resumeEdits) || !Array.isArray(value.missingRequirements)) return false;
  if (value.resumeEdits.some((e) => !e || typeof e.section !== "string" || typeof e.original !== "string" || typeof e.suggested !== "string" || typeof e.reason !== "string")) return false;
  if (value.missingRequirements.some((e) => typeof e !== "string")) return false;
  if (typeof value.coverLetter !== "string") return false;
  return allowed.has(value.applicationRecommendation);
}

test("accepts a complete truthful tailoring package", () => {
  assert.equal(isValidPackage({
    fitSummary: "Strong fit",
    tailoredSummary: "Experienced operations professional",
    resumeEdits: [{ section: "Summary", original: "Operations", suggested: "Operations and automation", reason: "Supported by profile" }],
    coverLetter: "Dear Hiring Team",
    missingRequirements: ["AWS certification"],
    applicationRecommendation: "consider",
  }), true);
});

test("rejects malformed resume edits", () => {
  assert.equal(isValidPackage({
    fitSummary: "Strong fit", tailoredSummary: "Summary", resumeEdits: [{ section: "Summary", suggested: "x" }],
    coverLetter: "x", missingRequirements: [], applicationRecommendation: "apply",
  }), false);
});

test("rejects unsupported recommendation values", () => {
  assert.equal(isValidPackage({ fitSummary: "x", tailoredSummary: "x", resumeEdits: [], coverLetter: "x", missingRequirements: [], applicationRecommendation: "maybe" }), false);
});

test("rejects non-string missing requirements", () => {
  assert.equal(isValidPackage({ fitSummary: "x", tailoredSummary: "x", resumeEdits: [], coverLetter: "x", missingRequirements: [42], applicationRecommendation: "skip" }), false);
});
