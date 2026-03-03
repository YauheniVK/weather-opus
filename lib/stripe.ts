import Stripe from "stripe";
import type { SubscriptionPlan } from "@/types";

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2024-06-20",
  typescript: true,
});

export const SUBSCRIPTION_PLANS: SubscriptionPlan[] = [
  {
    id: "premium-monthly",
    tier: "premium",
    name: "Premium Monthly",
    price: 5.99,
    interval: "month",
    priceId: process.env.STRIPE_PREMIUM_MONTHLY_PRICE_ID!,
    features: [
      "7-day extended forecast",
      "Currency converter",
      "10 currencies + cross-rates",
      "Space weather panel",
      "Solar system — static mode",
    ],
  },
  {
    id: "premium-annual",
    tier: "premium",
    name: "Premium Annual",
    price: 59.90,
    interval: "year",
    priceId: process.env.STRIPE_PREMIUM_ANNUAL_PRICE_ID!,
    savings: "Save 17%",
    features: [
      "7-day extended forecast",
      "Currency converter",
      "10 currencies + cross-rates",
      "Space weather panel",
      "Solar system — static mode",
    ],
  },
  {
    id: "elite-monthly",
    tier: "elite",
    name: "Elite Monthly",
    price: 19.99,
    interval: "month",
    priceId: process.env.STRIPE_ELITE_MONTHLY_PRICE_ID!,
    features: [
      "Everything in Premium",
      "NASA ephemeris animation",
      "Astronomy Photo of the Day",
    ],
  },
  {
    id: "elite-annual",
    tier: "elite",
    name: "Elite Annual",
    price: 199.90,
    interval: "year",
    priceId: process.env.STRIPE_ELITE_ANNUAL_PRICE_ID!,
    savings: "Save 17%",
    features: [
      "Everything in Premium",
      "NASA ephemeris animation",
      "Astronomy Photo of the Day",
    ],
  },
];

/** Determine subscription tier from a Stripe price ID. */
export function tierFromPriceId(priceId: string): "premium" | "elite" {
  const plan = SUBSCRIPTION_PLANS.find((p) => p.priceId === priceId);
  return plan?.tier ?? "premium";
}

export async function createOrRetrieveCustomer(
  email: string,
  existingCustomerId?: string | null
): Promise<string> {
  if (existingCustomerId) {
    // Verify customer still exists
    try {
      const customer = await stripe.customers.retrieve(existingCustomerId);
      if (!customer.deleted) return existingCustomerId;
    } catch {
      // Customer not found, create new one
    }
  }

  const customer = await stripe.customers.create({ email });
  return customer.id;
}

export async function createCheckoutSession(
  customerId: string,
  priceId: string,
  successUrl: string,
  cancelUrl: string
): Promise<Stripe.Checkout.Session> {
  return stripe.checkout.sessions.create({
    customer: customerId,
    payment_method_types: ["card"],
    mode: "subscription",
    line_items: [
      {
        price: priceId,
        quantity: 1,
      },
    ],
    success_url: successUrl,
    cancel_url: cancelUrl,
    allow_promotion_codes: true,
    billing_address_collection: "auto",
    subscription_data: {
      metadata: {
        customerId,
      },
    },
  });
}

export async function cancelSubscription(
  subscriptionId: string
): Promise<void> {
  await stripe.subscriptions.cancel(subscriptionId);
}
