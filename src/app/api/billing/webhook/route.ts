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
  const event = JSON.parse(payload);
  const object = event.data?.object;
  const customerId = object?.customer;
  if (!customerId) return NextResponse.json({ received: true });

  const subscription = await prisma.subscription.findFirst({ where: { providerCustomerId: customerId } });
  if (!subscription) return NextResponse.json({ received: true });

  if (["checkout.session.completed", "customer.subscription.created", "customer.subscription.updated"].includes(event.type)) {
    const active = ["active", "trialing"].includes(object.status || "");
    await prisma.subscription.update({ where: { userId: subscription.userId }, data: { plan: active ? "pro" : "free", status: object.status || "active", provider: "stripe", providerCustomerId: customerId, providerSubscriptionId: object.id || subscription.providerSubscriptionId, currentPeriodEnd: object.current_period_end ? new Date(object.current_period_end * 1000) : subscription.currentPeriodEnd } });
  }
  if (event.type === "customer.subscription.deleted") {
    await prisma.subscription.update({ where: { userId: subscription.userId }, data: { plan: "free", status: "canceled", currentPeriodEnd: object.current_period_end ? new Date(object.current_period_end * 1000) : subscription.currentPeriodEnd } });
  }
  return NextResponse.json({ received: true });
}
