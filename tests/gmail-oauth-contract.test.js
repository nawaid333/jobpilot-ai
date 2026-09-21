const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const CONNECT = path.join(process.cwd(), "src", "app", "api", "gmail", "connect", "route.ts");
const CALLBACK = path.join(process.cwd(), "src", "app", "api", "gmail", "callback", "route.ts");
const STATUS = path.join(process.cwd(), "src", "app", "api", "gmail", "status", "route.ts");
const GMAIL = path.join(process.cwd(), "src", "lib", "gmail.ts");

test("Gmail OAuth uses an authenticated, single-use state cookie bound to the current user", () => {
  const connect = fs.readFileSync(CONNECT, "utf8");
  const callback = fs.readFileSync(CALLBACK, "utf8");

  assert.match(connect, /getCurrentUser\(\)/, "OAuth initiation must require an authenticated user");
  assert.match(connect, /randomBytes\(32\)/, "OAuth state must use cryptographically random bytes");
  assert.match(connect, /jobpilot-gmail-state/,
    "OAuth state must be stored in the dedicated state cookie");
  assert.match(connect, /httpOnly:true/, "OAuth state cookie must be inaccessible to browser JavaScript");
  assert.match(connect, /sameSite:\"lax\"/, "OAuth state cookie must use SameSite protection");
  assert.match(connect, /maxAge:600/, "OAuth state cookie must expire quickly");

  assert.match(callback, /saved!==`\$\{user\.id\}\.\$\{state\}`/,
    "OAuth callback must bind the returned state to the authenticated user");
  assert.match(callback, /c\.delete\(\"jobpilot-gmail-state\"\)/,
    "OAuth callback must consume the state cookie before exchanging the code");
});

test("Gmail token storage remains encrypted and read-only", () => {
  const callback = fs.readFileSync(CALLBACK, "utf8");
  const gmail = fs.readFileSync(GMAIL, "utf8");

  assert.match(callback, /refreshToken:encryptToken\(token\.refresh_token\)/,
    "refresh tokens must be encrypted before persistence");
  assert.match(callback, /gmailGet\(\"\/users\/me\/profile\",token\.access_token\)/,
    "OAuth callback must validate the connected Gmail account through the Gmail API");
  assert.match(gmail, /auth\/gmail\.readonly/,
    "Gmail OAuth scope must remain read-only");
  assert.match(gmail, /cache:\"no-store\"/,
    "Gmail API responses must not be cached");
});

test("Gmail disconnect is authenticated, user-scoped, and atomically removes derived intelligence", () => {
  const status = fs.readFileSync(STATUS, "utf8");

  assert.match(status, /export async function DELETE\(\)/,
    "Gmail disconnect must be an explicit DELETE operation");
  assert.match(status, /getCurrentUser\(\)/,
    "Gmail disconnect must require authentication");
  assert.match(status, /prisma\.\$transaction\(async tx=>\{/,
    "connection and derived-data cleanup must be atomic");
  assert.match(status, /tx\.gmailConnection\.deleteMany\(\{where:\{userId:user\.id\}\}\)/,
    "disconnect must delete only the authenticated user's Gmail connection");
  assert.match(status, /tx\.emailSignal\.deleteMany\(\{where:\{userId:user\.id\}\}\)/,
    "disconnect must delete only the authenticated user's derived email intelligence");
  assert.match(status, /c\.delete\(\"jobpilot-gmail-state\"\)/,
    "disconnect must clear any pending OAuth state cookie");
});
