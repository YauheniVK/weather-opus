import { NextRequest, NextResponse } from "next/server";
import { getServerProfile } from "@/lib/auth-server";
import { stripe, createOrRetrieveCustomer, createCheckoutSession, SUBSCRIPTION_PLANS } from "@/lib/stripe";
import { updateProfile } from "@/lib/supabase";

export async function POST(request: NextRequest) {
  const profile = await getServerProfile();
  if (!profile?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const { planId } = await request.json();
    const plan = SUBSCRIPTION_PLANS.find((p) => p.id === planId);
    if (!plan) return NextResponse.json({ error: "Invalid plan" }, { status: 400 });

    const customerId = await createOrRetrieveCustomer(profile.email, profile.stripe_customer_id);

    if (!profile.stripe_customer_id) {
      await updateProfile(profile.email, { stripe_customer_id: customerId });
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
    const session = await createCheckoutSession(
      customerId,
      plan.priceId,
      `${appUrl}/dashboard?success=true`,
      `${appUrl}/pricing?canceled=true`
    );

    return NextResponse.json({ url: session.url });
  } catch (e) {
    console.error("Checkout error:", e);
    return NextResponse.json({ error: "Failed to create checkout session" }, { status: 500 });
  }
}
