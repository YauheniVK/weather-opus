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
  Gem,
} from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Navbar } from "@/components/layout/navbar";
import { PLAN_DISPLAY, ALL_FEATURES } from "@/lib/plans";

const TIER_ORDER = { free: 0, premium: 1, elite: 2 } as const;

function PricingContent() {
  const { profile, tier, isPremium, isElite } = useProfile();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [loadingPlan, setLoadingPlan] = useState<string | null>(null);
  const [billingInterval, setBillingInterval] = useState<"month" | "year">("month");

  const canceled = searchParams.get("canceled") === "true";

  const handleSubscribe = async (planId: string) => {
    if (!profile) {
      router.push("/");
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

  const premiumPlan = PLAN_DISPLAY.find(
    (p) => p.tier === "premium" && p.interval === billingInterval
  )!;
  const elitePlan = PLAN_DISPLAY.find(
    (p) => p.tier === "elite" && p.interval === billingInterval
  )!;

  /** Feature included at this tier or below? */
  const featureIncluded = (featureTier: string, columnTier: string) =>
    TIER_ORDER[columnTier as keyof typeof TIER_ORDER] >=
    TIER_ORDER[featureTier as keyof typeof TIER_ORDER];

  const tierLabel = tier === "elite" ? "Elite" : tier === "premium" ? "Premium" : null;

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-1 container max-w-6xl mx-auto px-4 py-12">
        {/* Back button */}
        <Link href="/dashboard">
          <Button variant="ghost" size="sm" className="mb-8 gap-2">
            <ArrowLeft className="h-4 w-4" />
            Back to Dashboard
          </Button>
        </Link>

        {/* Header */}
        <div className="text-center mb-10">
          {canceled && (
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-yellow-500/30 bg-yellow-500/10 px-4 py-2 text-sm text-yellow-500">
              Payment canceled — no charge was made.
            </div>
          )}
          {tierLabel && (
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-green-500/30 bg-green-500/10 px-4 py-2 text-sm text-green-500">
              <Crown className="h-4 w-4" />
              You have an active {tierLabel} subscription!
            </div>
          )}
          <h1 className="text-4xl font-bold tracking-tight mb-3">
            Choose Your Plan
          </h1>
          <p className="text-muted-foreground text-lg max-w-xl mx-auto">
            Upgrade for more features — or stay free forever.
          </p>

          {/* Billing toggle */}
          <div className="mt-6 inline-flex items-center gap-1 rounded-full border bg-muted/50 p-1">
            <button
              onClick={() => setBillingInterval("month")}
              className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
                billingInterval === "month"
                  ? "bg-background shadow text-foreground"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Monthly
            </button>
            <button
              onClick={() => setBillingInterval("year")}
              className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
                billingInterval === "year"
                  ? "bg-background shadow text-foreground"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Annual
            </button>
          </div>
        </div>

        {/* Plans grid — 3 columns */}
        <div className="grid gap-6 md:grid-cols-3 mb-16">
          {/* ── Free ─────────────────────────────────────────────── */}
          <div className={`rounded-2xl border p-8 flex flex-col ${tier === "free" ? "border-green-500/50 bg-green-500/5" : "bg-card"}`}>
            <div className="mb-6">
              <Badge variant="outline" className="mb-3">Free</Badge>
              <div className="flex items-end gap-1">
                <span className="text-4xl font-bold">$0</span>
                <span className="text-muted-foreground mb-1">/forever</span>
              </div>
            </div>
            <ul className="space-y-3 flex-1 mb-8">
              {ALL_FEATURES.map((f) =>
                featureIncluded(f.tier, "free") ? (
                  <li key={f.text} className="flex items-center gap-3 text-sm">
                    <Check className="h-4 w-4 text-green-500 shrink-0" />
                    {f.text}
                  </li>
                ) : (
                  <li key={f.text} className="flex items-center gap-3 text-sm text-muted-foreground/50">
                    <X className="h-4 w-4 shrink-0" />
                    {f.text}
                  </li>
                )
              )}
            </ul>
            <Button variant="outline" className="w-full" asChild>
              <Link href="/dashboard">
                {tier === "free" ? "Current Plan" : "Continue Free"}
              </Link>
            </Button>
          </div>

          {/* ── Premium ──────────────────────────────────────────── */}
          <div
            className={`rounded-2xl border p-8 flex flex-col relative ${
              tier === "premium"
                ? "border-blue-500/50 bg-gradient-to-b from-blue-500/10 to-card shadow-lg shadow-blue-500/10"
                : "bg-card"
            }`}
          >
            {tier !== "premium" && tier !== "elite" && (
              <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                <Badge variant="gradient" className="bg-gradient-to-r from-blue-500 to-cyan-500 text-white border-0 shadow-md">
                  <Sparkles className="mr-1 h-3 w-3" />
                  Popular
                </Badge>
              </div>
            )}
            {premiumPlan.savings && (
              <div className="absolute -top-3 right-6">
                <Badge variant="success" className="font-semibold">
                  {premiumPlan.savings}
                </Badge>
              </div>
            )}

            <div className="mb-6">
              <Badge variant="premium" className="mb-3 gap-1">
                <Crown className="h-3 w-3" />
                Premium
              </Badge>
              <div className="flex items-end gap-1">
                <span className="text-4xl font-bold">${premiumPlan.price}</span>
                <span className="text-muted-foreground mb-1">
                  /{premiumPlan.interval}
                </span>
              </div>
              {billingInterval === "year" && (
                <p className="text-sm text-muted-foreground mt-1">
                  ${(premiumPlan.price / 12).toFixed(2)}/month billed annually
                </p>
              )}
            </div>

            <ul className="space-y-3 flex-1 mb-8">
              {ALL_FEATURES.map((f) =>
                featureIncluded(f.tier, "premium") ? (
                  <li key={f.text} className="flex items-center gap-3 text-sm">
                    <Check className="h-4 w-4 text-blue-400 shrink-0" />
                    {f.text}
                  </li>
                ) : (
                  <li key={f.text} className="flex items-center gap-3 text-sm text-muted-foreground/50">
                    <X className="h-4 w-4 shrink-0" />
                    {f.text}
                  </li>
                )
              )}
            </ul>

            <Button
              className="w-full"
              variant="gradient"
              size="lg"
              onClick={() => handleSubscribe(premiumPlan.id)}
              disabled={!!loadingPlan || tier === "premium" || tier === "elite" || !profile}
            >
              {loadingPlan === premiumPlan.id ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Zap className="mr-2 h-4 w-4" />
              )}
              {tier === "premium" || tier === "elite"
                ? "Already Subscribed"
                : !profile
                ? "Sign in to Subscribe"
                : `Get Premium`}
            </Button>
          </div>

          {/* ── Elite ────────────────────────────────────────────── */}
          <div
            className={`rounded-2xl border p-8 flex flex-col relative ${
              tier === "elite"
                ? "border-purple-500/50 bg-gradient-to-b from-purple-500/10 to-card shadow-lg shadow-purple-500/10"
                : "bg-card"
            }`}
          >
            {elitePlan.savings && (
              <div className="absolute -top-3 right-6">
                <Badge variant="success" className="font-semibold">
                  {elitePlan.savings}
                </Badge>
              </div>
            )}

            <div className="mb-6">
              <Badge className="mb-3 gap-1 bg-purple-500/15 text-purple-400 border-purple-500/30">
                <Gem className="h-3 w-3" />
                Elite
              </Badge>
              <div className="flex items-end gap-1">
                <span className="text-4xl font-bold">${elitePlan.price}</span>
                <span className="text-muted-foreground mb-1">
                  /{elitePlan.interval}
                </span>
              </div>
              {billingInterval === "year" && (
                <p className="text-sm text-muted-foreground mt-1">
                  ${(elitePlan.price / 12).toFixed(2)}/month billed annually
                </p>
              )}
            </div>

            <ul className="space-y-3 flex-1 mb-8">
              {ALL_FEATURES.map((f) => (
                <li key={f.text} className="flex items-center gap-3 text-sm">
                  <Check className="h-4 w-4 text-purple-400 shrink-0" />
                  {f.text}
                </li>
              ))}
            </ul>

            <Button
              className="w-full bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white border-0"
              size="lg"
              onClick={() => handleSubscribe(elitePlan.id)}
              disabled={!!loadingPlan || isElite || !profile}
            >
              {loadingPlan === elitePlan.id ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Gem className="mr-2 h-4 w-4" />
              )}
              {isElite
                ? "Already Subscribed"
                : !profile
                ? "Sign in to Subscribe"
                : `Get Elite`}
            </Button>
          </div>
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
