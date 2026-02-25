"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { useProfile } from "@/components/providers";
import { toast } from "sonner";
import {
  Check,
  Sparkles,
  Zap,
  Crown,
  X,
  Loader2,
  ArrowLeft,
} from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Navbar } from "@/components/layout/navbar";
import { PLAN_DISPLAY, ALL_FEATURES } from "@/lib/plans";

function PricingContent() {
  const { profile, isPremium } = useProfile();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [loadingPlan, setLoadingPlan] = useState<string | null>(null);

  const canceled = searchParams.get("canceled") === "true";

  const handleSubscribe = async (planId: string) => {
    if (!profile) {
      router.push("/");
      return;
    }

    if (isPremium) {
      toast.info("You already have an active Premium subscription.");
      return;
    }

    setLoadingPlan(planId);
    try {
      const res = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ planId }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error ?? "Failed to create checkout session");
      }

      if (data.url) {
        window.location.href = data.url;
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoadingPlan(null);
    }
  };

  const allFeatures = ALL_FEATURES;

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-1 container max-w-5xl mx-auto px-4 py-12">
        {/* Back button */}
        <Link href="/dashboard">
          <Button variant="ghost" size="sm" className="mb-8 gap-2">
            <ArrowLeft className="h-4 w-4" />
            Back to Dashboard
          </Button>
        </Link>

        {/* Header */}
        <div className="text-center mb-12">
          {canceled && (
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-yellow-500/30 bg-yellow-500/10 px-4 py-2 text-sm text-yellow-500">
              Payment canceled — no charge was made.
            </div>
          )}
          {isPremium && (
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-green-500/30 bg-green-500/10 px-4 py-2 text-sm text-green-500">
              <Crown className="h-4 w-4" />
              You already have an active Premium subscription!
            </div>
          )}
          <h1 className="text-4xl font-bold tracking-tight mb-3">
            Choose Your Plan
          </h1>
          <p className="text-muted-foreground text-lg max-w-xl mx-auto">
            Upgrade to Premium for the full experience — or stay free forever.
          </p>
        </div>

        {/* Plans grid */}
        <div className="grid gap-6 md:grid-cols-3 mb-16">
          {/* Free plan */}
          <div className="rounded-2xl border bg-card p-8 flex flex-col">
            <div className="mb-6">
              <Badge variant="outline" className="mb-3">Free</Badge>
              <div className="flex items-end gap-1">
                <span className="text-4xl font-bold">$0</span>
                <span className="text-muted-foreground mb-1">/forever</span>
              </div>
            </div>
            <ul className="space-y-3 flex-1 mb-8">
              {allFeatures.filter((f) => f.free).map((f) => (
                <li key={f.text} className="flex items-center gap-3 text-sm">
                  <Check className="h-4 w-4 text-green-500 shrink-0" />
                  {f.text}
                </li>
              ))}
              {allFeatures.filter((f) => !f.free).map((f) => (
                <li key={f.text} className="flex items-center gap-3 text-sm text-muted-foreground/50">
                  <X className="h-4 w-4 shrink-0" />
                  {f.text}
                </li>
              ))}
            </ul>
            <Button variant="outline" className="w-full" asChild>
              <Link href="/dashboard">Continue Free</Link>
            </Button>
          </div>

          {/* Paid plans */}
          {PLAN_DISPLAY.map((plan, index) => {
            const isPopular = index === 0; // Monthly is "popular"
            const isAnnual = plan.id === "annual";

            return (
              <div
                key={plan.id}
                className={`rounded-2xl border p-8 flex flex-col relative ${
                  isPopular
                    ? "border-blue-500/50 bg-gradient-to-b from-blue-500/10 to-card shadow-lg shadow-blue-500/10"
                    : "bg-card"
                }`}
              >
                {isPopular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <Badge variant="gradient" className="bg-gradient-to-r from-blue-500 to-cyan-500 text-white border-0 shadow-md">
                      <Sparkles className="mr-1 h-3 w-3" />
                      Most Popular
                    </Badge>
                  </div>
                )}
                {isAnnual && plan.savings && (
                  <div className="absolute -top-3 right-6">
                    <Badge variant="success" className="font-semibold">
                      {plan.savings}
                    </Badge>
                  </div>
                )}

                <div className="mb-6">
                  <Badge variant="premium" className="mb-3 gap-1">
                    <Crown className="h-3 w-3" />
                    Premium
                  </Badge>
                  <div className="flex items-end gap-1">
                    <span className="text-4xl font-bold">${plan.price}</span>
                    <span className="text-muted-foreground mb-1">
                      /{plan.interval}
                    </span>
                  </div>
                  {isAnnual && (
                    <p className="text-sm text-muted-foreground mt-1">
                      ${(plan.price / 12).toFixed(2)}/month billed annually
                    </p>
                  )}
                </div>

                <ul className="space-y-3 flex-1 mb-8">
                  {allFeatures.map((f) => (
                    <li key={f.text} className="flex items-center gap-3 text-sm">
                      <Check className="h-4 w-4 text-blue-400 shrink-0" />
                      {f.text}
                    </li>
                  ))}
                </ul>

                <Button
                  className="w-full"
                  variant={isPopular ? "gradient" : "outline"}
                  size="lg"
                  onClick={() => handleSubscribe(plan.id)}
                  disabled={
                    !!loadingPlan || isPremium || !profile
                  }
                >
                  {loadingPlan === plan.id ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Zap className="mr-2 h-4 w-4" />
                  )}
                  {isPremium
                    ? "Already Subscribed"
                    : !profile
                    ? "Sign in to Subscribe"
                    : `Get ${plan.name}`}
                </Button>
              </div>
            );
          })}
        </div>

        {/* FAQ / Notes */}
        <div className="rounded-xl border bg-muted/30 p-6 text-center text-sm text-muted-foreground">
          <p>
            Payments are processed securely by{" "}
            <span className="font-semibold text-foreground">Stripe</span>.
            Cancel anytime from your billing portal. All prices in USD.
          </p>
        </div>
      </main>
    </div>
  );
}

export default function PricingPage() {
  return (
    <Suspense>
      <PricingContent />
    </Suspense>
  );
}
