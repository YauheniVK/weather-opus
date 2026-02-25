"use client";

import { useSearchParams } from "next/navigation";
import { Suspense, useEffect } from "react";
import { CloudSun, TrendingUp, Shield, Zap, Check, Chrome } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/theme-toggle";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";

function LandingContent() {
  const searchParams = useSearchParams();

  useEffect(() => {
    const error = searchParams.get("error");
    if (error === "AccountBlocked") {
      toast.error("Your account has been blocked. Contact support.");
    } else if (error) {
      toast.error(`Sign-in failed: ${error}`);
    }
  }, [searchParams]);

  const handleSignIn = async () => {
    const supabase = createClient();
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    });
  };

  const features = [
    {
      icon: <CloudSun className="h-6 w-6 text-blue-400" />,
      title: "Real-Time Weather",
      description: "Current conditions, 5–7 day forecast, humidity, wind, pressure — all in one view.",
    },
    {
      icon: <TrendingUp className="h-6 w-6 text-cyan-400" />,
      title: "Live Currency Rates",
      description: "Official NBRB daily exchange rates for USD, EUR, RUB, PLN & more with a built-in converter.",
    },
    {
      icon: <Shield className="h-6 w-6 text-purple-400" />,
      title: "Secure & Private",
      description: "Sign in with Google via Supabase Auth. Your data stays yours.",
    },
    {
      icon: <Zap className="h-6 w-6 text-amber-400" />,
      title: "Premium Features",
      description: "Extended forecasts, saved cities, ad-free experience, and priority support.",
    },
  ];

  const comparison = [
    { text: "Current weather",          free: true,  premium: true },
    { text: "5-day forecast",           free: true,  premium: true },
    { text: "NBRB currency rates",      free: true,  premium: true },
    { text: "Currency converter",       free: true,  premium: true },
    { text: "7-day extended forecast",  free: false, premium: true },
    { text: "Save multiple cities",     free: false, premium: true },
    { text: "Ad-free experience",       free: false, premium: true },
    { text: "Priority support",         free: false, premium: true },
  ];

  return (
    <div className="min-h-screen flex flex-col">
      {/* Navbar */}
      <header className="sticky top-0 z-40 border-b border-border/50 bg-background/80 backdrop-blur-md">
        <div className="container flex h-16 items-center justify-between px-4">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-blue-500 to-cyan-500 shadow-lg shadow-blue-500/30">
              <CloudSun className="h-5 w-5 text-white" />
            </div>
            <span className="font-bold text-lg">
              Weather<span className="text-blue-500">Opus</span>
            </span>
          </div>
          <div className="flex items-center gap-3">
            <ThemeToggle />
            <Button onClick={handleSignIn} variant="gradient" size="sm">
              <Chrome className="mr-2 h-4 w-4" />
              Sign in with Google
            </Button>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="relative flex flex-1 flex-col items-center justify-center overflow-hidden px-4 py-24 text-center">
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="absolute -left-20 -top-20 h-80 w-80 rounded-full bg-blue-500/20 blur-3xl" />
          <div className="absolute -right-20 top-1/3 h-80 w-80 rounded-full bg-cyan-500/20 blur-3xl" />
          <div className="absolute bottom-20 left-1/3 h-60 w-60 rounded-full bg-purple-500/10 blur-3xl" />
        </div>
        <div className="relative z-10 max-w-3xl mx-auto animate-fade-in">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-blue-500/30 bg-blue-500/10 px-4 py-1.5 text-sm text-blue-400">
            <Zap className="h-3.5 w-3.5" />
            Weather & Currency — All in One Dashboard
          </div>
          <h1 className="text-4xl font-bold tracking-tight sm:text-6xl mb-6">
            The <span className="gradient-text">Premium Dashboard</span> for Weather & Rates
          </h1>
          <p className="text-lg text-muted-foreground mb-10 max-w-xl mx-auto leading-relaxed">
            Real-time weather forecasts and official NBRB exchange rates in one beautiful, fast, and secure dashboard.
          </p>
          <Button onClick={handleSignIn} variant="gradient" size="xl" className="shadow-xl shadow-blue-500/30">
            <Chrome className="mr-2 h-5 w-5" />
            Get Started with Google
          </Button>
          <p className="mt-4 text-xs text-muted-foreground">Free forever · No credit card required</p>
        </div>
      </section>

      {/* Features */}
      <section className="border-t border-border/50 py-16 px-4">
        <div className="container max-w-5xl mx-auto">
          <h2 className="text-2xl font-bold text-center mb-10">Everything you need in one place</h2>
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            {features.map((f) => (
              <div key={f.title} className="rounded-xl border bg-card p-6 hover:border-primary/50 transition-colors">
                <div className="mb-3">{f.icon}</div>
                <h3 className="font-semibold mb-2">{f.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{f.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Comparison */}
      <section className="py-16 px-4 border-t border-border/50">
        <div className="container max-w-2xl mx-auto">
          <h2 className="text-2xl font-bold text-center mb-2">Simple, Transparent Pricing</h2>
          <p className="text-center text-muted-foreground mb-10">Start free, upgrade when you need more.</p>
          <div className="overflow-hidden rounded-xl border">
            <table className="w-full">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="py-3 px-6 text-left font-semibold">Feature</th>
                  <th className="py-3 px-4 text-center font-semibold">Free</th>
                  <th className="py-3 px-4 text-center font-semibold text-blue-400">Premium</th>
                </tr>
              </thead>
              <tbody>
                {comparison.map((row) => (
                  <tr key={row.text} className="border-b last:border-0">
                    <td className="py-3 px-6 text-sm">{row.text}</td>
                    <td className="py-3 px-4 text-center">
                      {row.free ? <Check className="h-4 w-4 text-green-500 mx-auto" /> : <span className="text-muted-foreground">—</span>}
                    </td>
                    <td className="py-3 px-4 text-center">
                      {row.premium && <Check className="h-4 w-4 text-blue-400 mx-auto" />}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="mt-6 text-center">
            <Button onClick={handleSignIn} variant="gradient" size="lg">Start for Free</Button>
          </div>
        </div>
      </section>

      <footer className="border-t border-border/50 py-8 text-center text-sm text-muted-foreground">
        <p>
          © {new Date().getFullYear()} WeatherOpus ·{" "}
          Weather data by <a href="https://openweathermap.org" target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline">OpenWeatherMap</a>
          {" "}· Exchange rates by{" "}
          <a href="https://www.nbrb.by" target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline">NBRB</a>
        </p>
      </footer>
    </div>
  );
}

export default function LandingPage() {
  return <Suspense><LandingContent /></Suspense>;
}
