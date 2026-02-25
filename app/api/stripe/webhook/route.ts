import { NextRequest, NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import { updateProfileByStripeCustomer } from "@/lib/supabase";
import type Stripe from "stripe";

// Required for raw body parsing in Next.js App Router
export const runtime = "nodejs";

async function getRawBody(request: NextRequest): Promise<Buffer> {
  const chunks: Uint8Array[] = [];
  const reader = request.body?.getReader();
  if (!reader) return Buffer.alloc(0);
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    if (value) chunks.push(value);
  }
  return Buffer.concat(chunks);
}

export async function POST(request: NextRequest) {
  const rawBody = await getRawBody(request);
  const sig = request.headers.get("stripe-signature");

  if (!sig) {
    return NextResponse.json({ error: "No signature" }, { status: 400 });
  }

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(
      rawBody,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
  } catch (err) {
    console.error("Webhook signature verification failed:", err);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        if (session.mode === "subscription" && session.subscription) {
          const subscription = await stripe.subscriptions.retrieve(
            session.subscription as string
          );
          const customerId = session.customer as string;
          const currentPeriodEnd = new Date(
            (subscription as any).current_period_end * 1000
          ).toISOString();
          const currentPeriodStart = new Date(
            (subscription as any).current_period_start * 1000
          ).toISOString();

          await updateProfileByStripeCustomer(customerId, {
            subscription_status: "premium",
            subscription_start: currentPeriodStart,
            subscription_end: currentPeriodEnd,
            stripe_subscription_id: subscription.id,
          });
        }
        break;
      }

      case "customer.subscription.updated": {
        const subscription = event.data.object as Stripe.Subscription;
        const customerId = subscription.customer as string;
        const isActive = ["active", "trialing"].includes(subscription.status);
        const currentPeriodEnd = new Date(
          (subscription as any).current_period_end * 1000
        ).toISOString();

        await updateProfileByStripeCustomer(customerId, {
          subscription_status: isActive ? "premium" : "free",
          subscription_end: isActive ? currentPeriodEnd : null,
          stripe_subscription_id: subscription.id,
        });
        break;
      }

      case "customer.subscription.deleted": {
        const subscription = event.data.object as Stripe.Subscription;
        const customerId = subscription.customer as string;

        await updateProfileByStripeCustomer(customerId, {
          subscription_status: "free",
          subscription_end: null,
          stripe_subscription_id: null,
        });
        break;
      }

      case "invoice.payment_failed": {
        const invoice = event.data.object as Stripe.Invoice;
        const customerId = invoice.customer as string;
        // Optionally send notification or mark as past_due
        console.warn(`Payment failed for customer ${customerId}`);
        break;
      }

      default:
        // Unhandled event type — ignore
        break;
    }
  } catch (error) {
    console.error("Webhook handler error:", error);
    return NextResponse.json(
      { error: "Webhook handler failed" },
      { status: 500 }
    );
  }

  return NextResponse.json({ received: true });
}
