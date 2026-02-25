"use client";

import { useState, useEffect, useCallback, useRef, Suspense } from "react";
import dynamic from "next/dynamic";
import { useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { AlertCircle, Sparkles, CloudSun, TrendingUp, Rocket } from "lucide-react";
import { WeatherSearch } from "@/components/weather/weather-search";
import { WeatherCard } from "@/components/weather/weather-card";
import { ForecastCard } from "@/components/weather/forecast-card";
import { WeatherSkeleton } from "@/components/weather/weather-skeleton";
import { CurrencyTable } from "@/components/currency/currency-table";
import { CurrencyConverter } from "@/components/currency/currency-converter";
import { CrossRatesPanel } from "@/components/currency/cross-rates-panel";
import { ApodCard } from "@/components/nasa/apod-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useProfile } from "@/components/providers";
import Link from "next/link";
import type { WeatherData, ProcessedRate, NASAApodData } from "@/types";

const WeatherMapDynamic = dynamic(
  () => import("@/components/weather/weather-map"),
  { ssr: false, loading: () => <div className="h-80 rounded-xl bg-muted animate-pulse" /> }
);

function DashboardContent() {
  const { profile, isPremium, refresh } = useProfile();
  const searchParams = useSearchParams();

  // ─── Weather state ───────────────────────────────────────────────────────────
  const [weatherData, setWeatherData] = useState<WeatherData | null>(null);
  const [coords, setCoords] = useState<{ lat: number; lon: number } | null>(null);
  const [weatherLoading, setWeatherLoading] = useState(false);
  const [weatherError, setWeatherError] = useState<string | null>(null);

  // ─── Currency state ──────────────────────────────────────────────────────────
  const [rates, setRates] = useState<ProcessedRate[]>([]);
  const [ratesDate, setRatesDate] = useState("");
  const [ratesLoading, setRatesLoading] = useState(true);

  // ─── NASA APOD state ─────────────────────────────────────────────────────────
  const [apodData, setApodData] = useState<NASAApodData | null>(null);
  const [apodLoading, setApodLoading] = useState(false);
  const [apodError, setApodError] = useState<string | null>(null);
  const apodFetchedRef = useRef(false);

  // ─── Stripe redirect toasts ──────────────────────────────────────────────────
  useEffect(() => {
    if (searchParams.get("success") === "true") {
      toast.success("Payment successful! Premium is now active.");
      refresh();
    }
    if (searchParams.get("canceled") === "true") {
      toast.info("Payment canceled. You can upgrade anytime.");
    }
  }, [searchParams, refresh]);

  // ─── Load currency rates on mount ────────────────────────────────────────────
  useEffect(() => {
    fetch("/api/currency")
      .then((r) => r.json())
      .then((d) => { setRates(d.rates ?? []); setRatesDate(d.date ?? ""); })
      .catch(() => toast.error("Failed to load currency rates"))
      .finally(() => setRatesLoading(false));
  }, []);

  // ─── Weather search handler ───────────────────────────────────────────────────
  const handleWeatherSearch = useCallback(async (query: string) => {
    setWeatherLoading(true);
    setWeatherError(null);
    setWeatherData(null);
    try {
      const url = query.startsWith("lat=")
        ? `/api/weather?${query}`
        : `/api/weather?city=${encodeURIComponent(query)}`;
      const res = await fetch(url);
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

  // ─── Auto-load weather by IP geolocation on mount ────────────────────────────
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

  // ─── NASA APOD fetch (lazy — only when Space tab is first opened) ─────────────
  const fetchApod = useCallback(async () => {
    if (apodFetchedRef.current) return;
    apodFetchedRef.current = true;
    setApodLoading(true);
    setApodError(null);
    try {
      const res = await fetch("/api/nasa/apod");
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
  }, []);

  const handleTabChange = (value: string) => {
    if (value === "space") {
      fetchApod();
    }
  };

  return (
    <div className="space-y-6">
      {/* ─── Header ─────────────────────────────────────────────────────────── */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            Welcome back
            {profile?.name && (
              <span className="text-muted-foreground font-normal">, {profile.name.split(" ")[0]}</span>
            )}
          </h1>
          <p className="text-sm text-muted-foreground">
            {new Date().toLocaleDateString("en-US", {
              weekday: "long",
              year: "numeric",
              month: "long",
              day: "numeric",
            })}
          </p>
        </div>
        {isPremium ? (
          <Badge variant="premium" className="gap-1.5 py-1.5 px-3">
            <Sparkles className="h-3.5 w-3.5" /> Premium Active
          </Badge>
        ) : (
          <Link href="/pricing">
            <Button variant="gradient" size="sm" className="gap-2">
              <Sparkles className="h-4 w-4" /> Upgrade to Premium
            </Button>
          </Link>
        )}
      </div>

      {/* ─── Tabs ────────────────────────────────────────────────────────────── */}
      <Tabs defaultValue="weather" className="space-y-6" onValueChange={handleTabChange}>
        <TabsList className="w-full sm:w-auto">
          <TabsTrigger value="weather" className="gap-2 flex-1 sm:flex-none">
            <CloudSun className="h-4 w-4" /> Weather
          </TabsTrigger>
          <TabsTrigger value="currency" className="gap-2 flex-1 sm:flex-none">
            <TrendingUp className="h-4 w-4" /> Currency
          </TabsTrigger>
          <TabsTrigger value="space" className="gap-2 flex-1 sm:flex-none">
            <Rocket className="h-4 w-4" /> Space
          </TabsTrigger>
        </TabsList>

        {/* ─── Weather tab ─────────────────────────────────────────────────── */}
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
              <WeatherCard data={weatherData} />
              {weatherData.forecast.length > 0 && (
                <ForecastCard forecast={weatherData.forecast} isPremium={isPremium} />
              )}
              {isPremium && coords && (
                <WeatherMapDynamic lat={coords.lat} lon={coords.lon} data={weatherData} />
              )}
            </div>
          )}
          {!weatherData && !weatherLoading && !weatherError && (
            <div className="flex flex-col items-center justify-center rounded-xl border border-dashed py-20 text-center">
              <CloudSun className="h-12 w-12 text-muted-foreground/40 mb-4" />
              <p className="text-muted-foreground font-medium">Search for a city or use your location</p>
              <p className="text-sm text-muted-foreground/60 mt-1">Get real-time weather data and forecasts</p>
            </div>
          )}
        </TabsContent>

        {/* ─── Currency tab ────────────────────────────────────────────────── */}
        <TabsContent value="currency" className="space-y-4">
          <div className="grid gap-4 lg:grid-cols-3">
            <div className="lg:col-span-2">
              <CurrencyTable rates={rates} date={ratesDate} isLoading={ratesLoading} isPremium={isPremium} />
            </div>
            <div>
              {rates.length > 0 ? (
                <CurrencyConverter rates={rates} />
              ) : (
                <div className="h-full rounded-xl border border-dashed flex items-center justify-center p-8 text-center text-muted-foreground text-sm">
                  Loading converter...
                </div>
              )}
            </div>
          </div>
          {rates.length > 0 && (
            <CrossRatesPanel rates={rates} isPremium={isPremium} />
          )}
        </TabsContent>

        {/* ─── Space tab ───────────────────────────────────────────────────── */}
        <TabsContent value="space" className="space-y-4">
          <div className="flex flex-col gap-1">
            <h2 className="text-base font-semibold">Astronomy Picture of the Day</h2>
            <p className="text-sm text-muted-foreground">
              Curated daily by NASA astronomers — {new Date().toLocaleDateString("en-US", {
                month: "long",
                day: "numeric",
                year: "numeric",
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
        </TabsContent>
      </Tabs>
    </div>
  );
}

export default function DashboardPage() {
  return <Suspense><DashboardContent /></Suspense>;
}
