import assert from "node:assert/strict";
import test from "node:test";

const baseUrl = (process.env.BASE_URL || "http://127.0.0.1:3000").replace(/\/$/, "");
const email = `session-qa-${Date.now()}@example.test`;
const password = "JobPilotQA!123";

async function request(path, options = {}) {
  const response = await fetch(`${baseUrl}${path}`, { redirect: "manual", ...options, headers: { ...(options.headers || {}) } });
  const text = await response.text();
  let body = null;
  if (text) { try { body = JSON.parse(text); } catch { body = text; } }
  return { response, body };
}

function cookieFrom(response) {
  const getSetCookie = response.headers.getSetCookie?.bind(response.headers);
  const values = getSetCookie ? getSetCookie() : [response.headers.get("set-cookie") || ""];
  const match = values.join(",").match(/(?:^|,)\s*jobpilot-session=([^;]+)/);
  assert.ok(match, "Expected jobpilot session cookie");
  return `jobpilot-session=${match[1]}`;
}

test("logout invalidates the authenticated session", async () => {
  const signup = await request("/api/auth/signup", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ email, password, name: "Session QA" }),
  });
  assert.equal(signup.response.status, 201, JSON.stringify(signup.body));
  const cookie = cookieFrom(signup.response);

  const before = await request("/api/profile", { headers: { cookie } });
  assert.notEqual(before.response.status, 401);

  const logout = await request("/api/auth/logout", { method: "POST", headers: { cookie } });
  assert.equal(logout.response.status, 200, JSON.stringify(logout.body));
  assert.match(logout.response.headers.get("set-cookie") || "", /Max-Age=0|expires=/i);

  const after = await request("/api/profile", { headers: { cookie } });
  assert.equal(after.response.status, 401);
});
