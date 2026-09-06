import { NextResponse } from "next/server";
import crypto from "node:crypto";
import { prisma } from "@/lib/prisma";

function verify(payload: string, signature: string, secret: string) {
  const parts = signature.split(",");
  const timestamp = parts.find(p => p.startsWith("t="))?.slice(2);
  const signatures = parts.filter(p => p.startsWith("v1=")).map(p => p.slice(3));
  if (!timestamp || !signatures.length) return false;
  const age = Math.abs(Date.now() / 1000 - Number(timestamp));
  if (!Number.isFinite(age) || age > 300) return false;
  const expected = crypto.createHmac("sha256", secret).update(`${timestamp}.${payload}`).digest("hex");
  return signatures.some(value => value.length === expected.length && crypto.timingSafeEqual(Buffer.from(value), Buffer.from(expected)));
}

export async function POST(request: Request) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret) return NextResponse.json({ error: "Webhook is not configured." }, { status: 503 });
  const payload = await request.text();
  const signature = request.headers.get("stripe-signature") || "";
  if (!verify(payload, signature, secret)) return NextResponse.json({ error: "Invalid signature." }, { status: 400 });

  let event: { type?: string; data?: { object?: Record<string, unknown> } };
  try { event = JSON.parse(payload); } catch { return NextResponse.json({ error: "Invalid payload." }, { status: 400 }); }

  const object = event.data?.object ?? {};
  const customerId = typeof object.customer === "string" ? object.customer : undefined;
  if (!customerId) return NextResponse.json({ received: true });
  const subscription = await prisma.subscription.findFirst({ where: { providerCustomerId: customerId } });
  if (!subscription) return NextResponse.json({ received: true });

  if (["customer.subscription.created", "customer.subscription.updated"].includes(event.type || "")) {
    const status = typeof object.status === "string" ? object.status : subscription.status;
    const active = ["active", "trialing"].includes(status);
    await prisma.subscription.update({ where: { userId: subscription.userId }, data: { plan: active ? "pro" : "free", status, provider: "stripe", providerCustomerId: customerId, providerSubscriptionId: typeof object.id === "string" ? object.id : subscription.providerSubscriptionId, currentPeriodEnd: typeof object.current_period_end === "number" ? new Date(object.current_period_end * 1000) : subscription.currentPeriodEnd } });
  } else if (event.type === "customer.subscription.deleted") {
    await prisma.subscription.update({ where: { userId: subscription.userId }, data: { plan: "free", status: "canceled", currentPeriodEnd: typeof object.current_period_end === "number" ? new Date(object.current_period_end * 1000) : subscription.currentPeriodEnd } });
  } else if (event.type === "checkout.session.completed") {
    const subscriptionId = typeof object.subscription === "string" ? object.subscription : undefined;
    if (subscriptionId) await prisma.subscription.update({ where: { userId: subscription.userId }, data: { provider: "stripe", providerCustomerId: customerId, providerSubscriptionId: subscriptionId } });
  }
  return NextResponse.json({ received: true });
}
