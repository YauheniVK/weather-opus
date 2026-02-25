import Stripe from "stripe";
import type { SubscriptionPlan } from "@/types";

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2024-06-20",
  typescript: true,
});

export const SUBSCRIPTION_PLANS: SubscriptionPlan[] = [
  {
    id: "monthly",
    name: "Premium Monthly",
    price: 9.99,
    interval: "month",
    priceId: process.env.STRIPE_MONTHLY_PRICE_ID!,
    features: [
      "7-day extended forecast",
      "Ad-free experience",
      "Save up to 10 cities",
      "Priority support",
      "Historical weather data",
      "Weather alerts & notifications",
    ],
  },
  {
    id: "annual",
    name: "Premium Annual",
    price: 79.99,
    interval: "year",
    priceId: process.env.STRIPE_ANNUAL_PRICE_ID!,
    savings: "Save 33%",
    features: [
      "7-day extended forecast",
      "Ad-free experience",
      "Save up to 10 cities",
      "Priority support",
      "Historical weather data",
      "Weather alerts & notifications",
      "Advanced analytics",
    ],
  },
];

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
