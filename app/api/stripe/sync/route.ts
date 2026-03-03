import { NextResponse } from "next/server";
import { getServerProfile } from "@/lib/auth-server";
import { stripe, tierFromPriceId } from "@/lib/stripe";
import { updateProfile } from "@/lib/supabase";

/**
 * POST /api/stripe/sync
 *
 * Called after Stripe redirect (?success=true) to sync subscription status
 * from Stripe → Supabase, in case the webhook hasn't arrived yet.
 */
export async function POST() {
  const profile = await getServerProfile();
  console.log("[stripe/sync] profile:", profile?.email, "stripe_customer_id:", profile?.stripe_customer_id, "current_status:", profile?.subscription_status);

  if (!profile?.email) {
    console.log("[stripe/sync] ABORT: no profile/email");
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!profile.stripe_customer_id) {
    console.log("[stripe/sync] ABORT: no stripe_customer_id for", profile.email);
    return NextResponse.json({ synced: false, reason: "no_customer_id" });
  }

  try {
    const subscriptions = await stripe.subscriptions.list({
      customer: profile.stripe_customer_id,
      status: "active",
      limit: 1,
    });
    console.log("[stripe/sync] Stripe subscriptions found:", subscriptions.data.length);

    if (subscriptions.data.length > 0) {
      const sub = subscriptions.data[0];
      const currentPeriodEnd = new Date(
        sub.current_period_end * 1000
      ).toISOString();
      const currentPeriodStart = new Date(
        sub.current_period_start * 1000
      ).toISOString();

      const priceId = sub.items.data[0]?.price?.id;
      const tier = priceId ? tierFromPriceId(priceId) : "premium";

      console.log("[stripe/sync] Updating profile:", profile.email, "→", tier, "sub:", sub.id, "end:", currentPeriodEnd);
      const updated = await updateProfile(profile.email, {
        subscription_status: tier,
        subscription_start: currentPeriodStart,
        subscription_end: currentPeriodEnd,
        stripe_subscription_id: sub.id,
      });
      console.log("[stripe/sync] updateProfile result:", updated ? "OK" : "FAILED (null)");

      return NextResponse.json({ synced: true, status: tier });
    }

    console.log("[stripe/sync] No active subscriptions for customer", profile.stripe_customer_id);
    return NextResponse.json({ synced: false, reason: "no_active_subscription" });
  } catch (error) {
    console.error("[stripe/sync] ERROR:", error);
    return NextResponse.json({ error: "Sync failed" }, { status: 500 });
  }
}
