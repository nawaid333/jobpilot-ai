import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";

function appUrl() {
  return (process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000").replace(/\/$/, "");
}

export async function POST() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const secretKey = process.env.STRIPE_SECRET_KEY;
  const priceId = process.env.STRIPE_PRO_PRICE_ID;
  if (!secretKey || !priceId) {
    return NextResponse.json({ error: "Billing is not configured." }, { status: 503 });
  }

  const params = new URLSearchParams();
  params.set("mode", "subscription");
  params.set("line_items[0][price]", priceId);
  params.set("line_items[0][quantity]", "1");
  params.set("success_url", `${appUrl()}/billing?checkout=success`);
  params.set("cancel_url", `${appUrl()}/billing?checkout=cancelled`);
  params.set("client_reference_id", user.id);
  params.set("metadata[userId]", user.id);
  params.set("subscription_data[metadata][userId]", user.id);

  const existing = user.subscription?.providerCustomerId;
  if (existing) params.set("customer", existing);
  else params.set("customer_email", user.email);

  const response = await fetch("https://api.stripe.com/v1/checkout/sessions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${secretKey}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: params,
  });

  if (!response.ok) {
    const error = await response.json().catch(() => null) as { error?: { message?: string } } | null;
    console.error("Stripe checkout session creation failed", response.status, error?.error?.message || "unknown error");
    return NextResponse.json({ error: "Unable to start checkout." }, { status: 502 });
  }

  const session = await response.json() as { id?: string; url?: string };
  if (!session.url) return NextResponse.json({ error: "Stripe did not return a checkout URL." }, { status: 502 });

  return NextResponse.json({ checkoutUrl: session.url, sessionId: session.id });
}
