import assert from "node:assert/strict";
import test from "node:test";
import crypto from "node:crypto";

const baseUrl = (process.env.BASE_URL || "http://127.0.0.1:3000").replace(/\/$/, "");
const secret = process.env.STRIPE_WEBHOOK_SECRET || "ci-webhook-secret";

function signed(payload) {
  const timestamp = Math.floor(Date.now() / 1000);
  const digest = crypto.createHmac("sha256", secret).update(`${timestamp}.${payload}`).digest("hex");
  return `t=${timestamp},v1=${digest}`;
}

async function request(payload, signature) {
  return fetch(`${baseUrl}/api/billing/webhook`, {
    method: "POST",
    headers: { "content-type": "application/json", "stripe-signature": signature },
    body: payload,
  });
}

test("billing webhook rejects missing signatures", async () => {
  const response = await request(JSON.stringify({ type: "customer.subscription.updated", data: { object: {} } }), "");
  assert.equal(response.status, 400);
});

test("billing webhook rejects invalid signatures", async () => {
  const payload = JSON.stringify({ type: "customer.subscription.updated", data: { object: {} } });
  const response = await request(payload, signed(payload).replace(/v1=.*/, "v1=invalid"));
  assert.equal(response.status, 400);
});

test("billing webhook rejects malformed payload after signature verification", async () => {
  const payload = "{invalid-json";
  const response = await request(payload, signed(payload));
  assert.equal(response.status, 400);
});

test("billing webhook accepts a valid harmless event", async () => {
  const payload = JSON.stringify({ type: "invoice.paid", data: { object: { customer: "unknown-ci-customer" } } });
  const response = await request(payload, signed(payload));
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { received: true });
});
