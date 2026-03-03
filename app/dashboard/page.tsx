"use client";

import { useState, useEffect, useCallback, useRef, Suspense } from "react";
import dynamic from "next/dynamic";
import { useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { AlertCircle, Sparkles, CloudSun, TrendingUp, Rocket, Lock, Gem } from "lucide-react";
import { WeatherSearch }   from "@/components/weather/weather-search";
import { WeatherCard }     from "@/components/weather/weather-card";
import { ForecastCard }    from "@/components/weather/forecast-card";
import { WeatherSkeleton } from "@/components/weather/weather-skeleton";
import { CurrencyTable }   from "@/components/currency/currency-table";
import { CurrencyConverter } from "@/components/currency/currency-converter";
import { CrossRatesPanel } from "@/components/currency/cross-rates-panel";
import { SolarActivity }   from "@/components/SolarActivity";
import { ApodCard }        from "@/components/nasa/apod-card";
import SpaceDashboard      from "@/components/SpaceDashboard";
import { Badge }           from "@/components/ui/badge";
import { Button }          from "@/components/ui/button";
import { Separator }       from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useProfile }      from "@/components/providers";
import Link                from "next/link";
import type { WeatherData, ProcessedRate, NASAApodData } from "@/types";

const WeatherMapDynamic = dynamic(
  () => import("@/components/weather/weather-map"),
  { ssr: false, loading: () => <div className="h-80 rounded-xl bg-muted animate-pulse" /> }
);

function DashboardContent() {
  const { tier, isPremium, isElite, refresh, loading: profileLoading } = useProfile();
  const searchParams = useSearchParams();

  // ─── Weather state ────────────────────────────────────────────────────────
  const [weatherData, setWeatherData]   = useState<WeatherData | null>(null);
  const [coords, setCoords]             = useState<{ lat: number; lon: number } | null>(null);
  const [weatherLoading, setWeatherLoading] = useState(false);
  const [weatherError, setWeatherError] = useState<string | null>(null);

  // ─── Currency state ───────────────────────────────────────────────────────
  const [rates, setRates]       = useState<ProcessedRate[]>([]);
  const [ratesDate, setRatesDate] = useState("");
  const [ratesLoading, setRatesLoading] = useState(true);

  // ─── NASA APOD state ──────────────────────────────────────────────────────
  const [apodData, setApodData]   = useState<NASAApodData | null>(null);
  const [apodLoading, setApodLoading] = useState(false);
  const [apodError, setApodError] = useState<string | null>(null);
  const apodFetchedRef = useRef(false);
  const stripeToastShownRef = useRef(false);

  // ─── Stripe redirect: sync subscription from Stripe API, then refresh ─────
  useEffect(() => {
    if (stripeToastShownRef.current) return;
    if (searchParams.get("success") === "true") {
      stripeToastShownRef.current = true;
      toast.success("Payment successful! Activating your subscription…");
      fetch("/api/stripe/sync", { method: "POST" })
        .then(() => refresh())
        .catch(() => refresh());
    }
    if (searchParams.get("canceled") === "true") {
      stripeToastShownRef.current = true;
      toast.info("Payment canceled. You can upgrade anytime.");
    }
  }, [searchParams, refresh]);

  // ─── Load currency rates on mount ─────────────────────────────────────────
  useEffect(() => {
    fetch("/api/currency")
      .then((r) => r.json())
      .then((d) => { setRates(d.rates ?? []); setRatesDate(d.date ?? ""); })
      .catch(() => toast.error("Failed to load currency rates"))
      .finally(() => setRatesLoading(false));
  }, []);

  // ─── Weather search ───────────────────────────────────────────────────────
  const handleWeatherSearch = useCallback(async (query: string) => {
    setWeatherLoading(true);
    setWeatherError(null);
    setWeatherData(null);
    try {
      const url = query.startsWith("lat=")
        ? `/api/weather?${query}`
        : `/api/weather?city=${encodeURIComponent(query)}`;
      const res  = await fetch(url);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to fetch weather");
      setWeatherData(data);
      setCoords({ lat: data.lat, lon: data.lon });
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to fetch weather";
      setWeatherError(msg);
      toast.error(msg);
    } finally {
      setWeatherLoading(false);
    }
  }, []);

  // ─── Auto-load weather by IP geolocation on mount ─────────────────────────
  useEffect(() => {
    fetch("/api/geolocation")
      .then((r) => r.json())
      .then((d) => {
        if (d.lat && d.lon) {
          handleWeatherSearch(`lat=${d.lat}&lon=${d.lon}`);
        }
      })
      .catch(() => {
        // Silent fail — user can search manually or use "My Location"
      });
  }, [handleWeatherSearch]);

  // ─── NASA APOD — lazy fetch on first Space tab visit (Elite only) ─────────
  const fetchApod = useCallback(async () => {
    if (apodFetchedRef.current || !isElite) return;
    apodFetchedRef.current = true;
    setApodLoading(true);
    setApodError(null);
    try {
      const res  = await fetch("/api/nasa/apod");
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to fetch APOD");
      setApodData(data);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to fetch APOD";
      setApodError(msg);
      toast.error(msg);
    } finally {
      setApodLoading(false);
    }
  }, [isElite]);

  const handleTabChange = (value: string) => {
    if (value === "space") fetchApod();
  };

  // Wait for profile before rendering — prevents flash of free-tier UI
  if (profileLoading) {
    return (
      <div className="space-y-6">
        <div className="h-10 w-56 rounded-lg bg-muted animate-pulse" />
        <div className="h-[480px] rounded-xl bg-muted animate-pulse" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* ── Tabs ────────────────────────────────────────────────────────── */}
      <Tabs defaultValue="currency" className="space-y-6" onValueChange={handleTabChange}>
        <TabsList className="w-full sm:w-auto">
          <TabsTrigger value="currency" className="gap-2 flex-1 sm:flex-none">
            <TrendingUp className="h-4 w-4" /> Currency
          </TabsTrigger>
          <TabsTrigger value="weather"  className="gap-2 flex-1 sm:flex-none">
            <CloudSun className="h-4 w-4" /> Weather
          </TabsTrigger>
          <TabsTrigger value="space"    className="gap-2 flex-1 sm:flex-none">
            <Rocket className="h-4 w-4" /> Space
          </TabsTrigger>
        </TabsList>

        {/* ── Currency tab ────────────────────────────────────────────── */}
        <TabsContent value="currency" className="space-y-4">
          <div className="grid gap-4 lg:grid-cols-2 lg:items-start">
            {/* Left: exchange rates table */}
            <CurrencyTable rates={rates} date={ratesDate} isLoading={ratesLoading} isPremium={isPremium} />

            {/* Right: cross rates + converter stacked */}
            <div className="space-y-4">
              <CrossRatesPanel rates={rates} isPremium={isPremium} />

              {isPremium ? (
                rates.length > 0 ? (
                  <CurrencyConverter rates={rates} />
                ) : (
                  <div className="rounded-xl border border-dashed flex items-center justify-center p-8 text-center text-muted-foreground text-sm">
                    Loading converter...
                  </div>
                )
              ) : (
                <div className="relative rounded-xl border bg-card overflow-hidden">
                  <div className="blur-sm pointer-events-none select-none opacity-40 p-6 space-y-4">
                    <div className="h-5 w-36 bg-muted rounded" />
                    <div className="h-10 w-full bg-muted rounded" />
                    <div className="flex gap-2">
                      <div className="flex-1 h-10 bg-muted rounded" />
                      <div className="h-10 w-10 bg-muted rounded shrink-0" />
                      <div className="flex-1 h-10 bg-muted rounded" />
                    </div>
                    <div className="h-10 w-full bg-muted rounded" />
                  </div>
                  <div className="absolute inset-0 flex flex-col items-center justify-center gap-2">
                    <Lock className="h-6 w-6 text-muted-foreground" />
                    <p className="text-sm font-medium text-muted-foreground">Currency Converter</p>
                    <Link href="/pricing">
                      <Button size="sm" variant="gradient" className="gap-1.5">
                        <Sparkles className="h-3.5 w-3.5" /> Upgrade to Premium
                      </Button>
                    </Link>
                  </div>
                </div>
              )}
            </div>
          </div>
        </TabsContent>

        {/* ── Weather tab ─────────────────────────────────────────────── */}
        <TabsContent value="weather" className="space-y-4">
          <WeatherSearch onSearch={handleWeatherSearch} isLoading={weatherLoading} />

          {weatherLoading && <WeatherSkeleton />}

          {weatherError && !weatherLoading && (
            <div className="flex items-center gap-3 rounded-xl border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
              <AlertCircle className="h-4 w-4 shrink-0" /> {weatherError}
            </div>
          )}

          {weatherData && !weatherLoading && (
            <div className="space-y-4 animate-fade-in">
              {/* 2-column: Weather+Map (2/3) | Forecast vertical (1/3), bottom-aligned */}
              <div className="grid gap-4 lg:grid-cols-3 lg:items-stretch">
                <div className="lg:col-span-2 space-y-4">
                  <WeatherCard data={weatherData} />
                  {coords && (
                    <WeatherMapDynamic lat={coords.lat} lon={coords.lon} data={weatherData} />
                  )}
                </div>
                {weatherData.forecast.length > 0 && (
                  <div className="lg:col-span-1">
                    <ForecastCard forecast={weatherData.forecast} isPremium={isPremium} layout="vertical" />
                  </div>
                )}
              </div>

              {/* Solar activity — full width */}
              <SolarActivity layout="wide" />
            </div>
          )}

          {/* Empty state */}
          {!weatherData && !weatherLoading && !weatherError && (
            <div className="flex flex-col items-center justify-center rounded-xl border border-dashed py-20 text-center">
              <CloudSun className="h-12 w-12 text-muted-foreground/40 mb-4" />
              <p className="text-muted-foreground font-medium">Search for a city or use your location</p>
              <p className="text-sm text-muted-foreground/60 mt-1">Get real-time weather data and forecasts</p>
            </div>
          )}
        </TabsContent>

        {/* ── Space tab ───────────────────────────────────────────────── */}
        <TabsContent value="space" className="space-y-6">

          {isPremium ? (
            <>
              {/* Solar system map + voyager tracker */}
              <SpaceDashboard isElite={isElite} />

              {/* NASA Astronomy Picture of the Day — Elite only */}
              {isElite && (
                <>
                  <Separator />
                  <div className="space-y-4">
                    <div className="flex flex-col gap-1">
                      <h2 className="text-base font-semibold">Astronomy Picture of the Day</h2>
                      <p className="text-sm text-muted-foreground">
                        Curated daily by NASA astronomers —{" "}
                        {new Date().toLocaleDateString("en-US", {
                          month: "long",
                          day:   "numeric",
                          year:  "numeric",
                        })}
                      </p>
                    </div>
                    <ApodCard data={apodData} isLoading={apodLoading} error={apodError} />
                    {!apodData && !apodLoading && !apodError && (
                      <div className="flex flex-col items-center justify-center rounded-xl border border-dashed py-20 text-center">
                        <Rocket className="h-12 w-12 text-muted-foreground/40 mb-4" />
                        <p className="text-muted-foreground font-medium">Loading space content…</p>
                      </div>
                    )}
                  </div>
                </>
              )}

              {/* APOD upgrade CTA for Premium (non-Elite) users */}
              {!isElite && (
                <>
                  <Separator />
                  <div className="relative rounded-xl border bg-card overflow-hidden">
                    <div className="blur-sm pointer-events-none select-none opacity-40 p-6 space-y-4">
                      <div className="h-6 w-64 bg-muted rounded" />
                      <div className="h-64 w-full bg-muted rounded-xl" />
                      <div className="h-4 w-full bg-muted rounded" />
                    </div>
                    <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
                      <Lock className="h-8 w-8 text-muted-foreground" />
                      <p className="text-base font-semibold text-muted-foreground">Astronomy Photo of the Day</p>
                      <p className="text-sm text-muted-foreground/70">Available with Elite subscription</p>
                      <Link href="/pricing">
                        <Button size="sm" className="gap-1.5 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white border-0">
                          <Gem className="h-3.5 w-3.5" /> Upgrade to Elite
                        </Button>
                      </Link>
                    </div>
                  </div>
                </>
              )}
            </>
          ) : (
            /* Free users — locked Space tab */
            <div className="relative rounded-xl border bg-card overflow-hidden">
              <div className="blur-sm pointer-events-none select-none opacity-40 p-6 space-y-6">
                <div className="h-8 w-48 bg-muted rounded" />
                <div className="h-[400px] w-full bg-muted rounded-xl" />
                <div className="grid grid-cols-2 gap-4">
                  <div className="h-32 bg-muted rounded-xl" />
                  <div className="h-32 bg-muted rounded-xl" />
                </div>
              </div>
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
                <Lock className="h-10 w-10 text-muted-foreground" />
                <p className="text-lg font-semibold text-muted-foreground">Solar System Dashboard</p>
                <p className="text-sm text-muted-foreground/70">Available with Premium or Elite subscription</p>
                <Link href="/pricing">
                  <Button size="sm" variant="gradient" className="gap-1.5">
                    <Sparkles className="h-3.5 w-3.5" /> Upgrade to Premium
                  </Button>
                </Link>
              </div>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

export default function DashboardPage() {
  return <Suspense><DashboardContent /></Suspense>;
}
