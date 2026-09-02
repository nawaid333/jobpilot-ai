import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const secret = process.env.STRIPE_SECRET_KEY;
  const price = process.env.STRIPE_PRO_PRICE_ID;
  if (!secret || !price) return NextResponse.json({ error: "Stripe billing is not configured yet." }, { status: 503 });

  const existing = await prisma.subscription.findUnique({ where: { userId: user.id } });
  let customerId = existing?.providerCustomerId;
  if (!customerId) {
    const body = new URLSearchParams({ email: user.email, metadata_userId: user.id });
    const customerResponse = await fetch("https://api.stripe.com/v1/customers", { method: "POST", headers: { Authorization: `Bearer ${secret}`, "Content-Type": "application/x-www-form-urlencoded" }, body });
    if (!customerResponse.ok) return NextResponse.json({ error: "Unable to create billing customer." }, { status: 502 });
    const customer = await customerResponse.json();
    customerId = customer.id;
    await prisma.subscription.upsert({ where: { userId: user.id }, create: { userId: user.id, provider: "stripe", providerCustomerId: customerId }, update: { provider: "stripe", providerCustomerId: customerId } });
  }

  const origin = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  const params = new URLSearchParams({ mode: "subscription", customer: customerId, "line_items[0][price]": price, "line_items[0][quantity]": "1", success_url: `${origin}/pricing?checkout=success`, cancel_url: `${origin}/pricing?checkout=cancelled`, "metadata[userId]": user.id });
  const response = await fetch("https://api.stripe.com/v1/checkout/sessions", { method: "POST", headers: { Authorization: `Bearer ${secret}`, "Content-Type": "application/x-www-form-urlencoded" }, body: params });
  if (!response.ok) return NextResponse.json({ error: "Unable to create checkout session." }, { status: 502 });
  const session = await response.json();
  return NextResponse.json({ url: session.url });
}
