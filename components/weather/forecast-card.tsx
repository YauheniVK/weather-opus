"use client";

import Image from "next/image";
import { Lock, Droplets } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { getWeatherIconUrl, formatTemperature, formatDate } from "@/lib/utils";
import type { ForecastDay } from "@/types";
import Link from "next/link";

interface ForecastCardProps {
  forecast: ForecastDay[];
  isPremium: boolean;
  layout?: "horizontal" | "vertical";
}

export function ForecastCard({ forecast, isPremium, layout = "horizontal" }: ForecastCardProps) {
  const visibleDays = isPremium ? forecast : forecast.slice(0, 2);
  const lockedDays = isPremium ? [] : forecast.slice(2);

  if (layout === "vertical") {
    return (
      <Card className="h-full flex flex-col">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base font-semibold">
              {isPremium ? "7-Day Forecast" : "2-Day Forecast"}
            </CardTitle>
            {!isPremium && forecast.length > 2 && (
              <Badge variant="premium" className="gap-1 text-[10px]">
                <Lock className="h-2.5 w-2.5" />
                +5 days
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent className="p-4 pt-0 flex-1 flex flex-col min-h-0">
          <div className="flex-1 flex flex-col gap-1.5">
            {visibleDays.map((day) => (
              <ForecastDayTile key={day.date} day={day} />
            ))}

            {lockedDays.length > 0 && (
              <div className="relative flex-1 flex flex-col min-h-0">
                <div className="flex-1 flex flex-col gap-1.5 blur-sm pointer-events-none select-none opacity-40">
                  {lockedDays.map((day) => (
                    <ForecastDayTile key={day.date} day={day} />
                  ))}
                </div>
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-2">
                  <Lock className="h-5 w-5 text-muted-foreground" />
                  <Link href="/pricing">
                    <Button size="sm" variant="gradient" className="gap-1.5 text-xs">
                      Unlock 7 days
                    </Button>
                  </Link>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    );
  }

  // ── Horizontal layout (default) ─────────────────────────────────────────
  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base font-semibold">
            {isPremium ? "7-Day Forecast" : "2-Day Forecast"}
          </CardTitle>
          {!isPremium && forecast.length > 2 && (
            <Badge variant="premium" className="gap-1 text-[10px]">
              <Lock className="h-2.5 w-2.5" />
              7-Day available with Premium
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="p-4 pt-0">
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5 xl:grid-cols-7">
          {visibleDays.map((day) => (
            <ForecastDayCard key={day.date} day={day} />
          ))}

          {lockedDays.map((day) => (
            <div
              key={day.date}
              className="relative rounded-xl border border-dashed border-border p-3 text-center opacity-40 select-none"
            >
              <div className="blur-sm">
                <ForecastDayCard day={day} />
              </div>
              <div className="absolute inset-0 flex items-center justify-center">
                <Lock className="h-5 w-5 text-muted-foreground" />
              </div>
            </div>
          ))}
        </div>

        {!isPremium && lockedDays.length > 0 && (
          <div className="mt-4 rounded-lg bg-gradient-to-r from-blue-500/10 to-purple-500/10 border border-blue-500/20 p-4 text-center">
            <p className="text-sm text-muted-foreground mb-2">
              Upgrade to Premium for the full 7-day forecast
            </p>
            <Link href="/pricing">
              <Button size="sm" variant="gradient">
                Upgrade to Premium
              </Button>
            </Link>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ── Vertical tile (fills height evenly, elegant) ─────────────────────────
function ForecastDayTile({ day }: { day: ForecastDay }) {
  return (
    <div className="flex-1 flex items-center gap-4 rounded-xl bg-muted/40 px-4 hover:bg-muted/60 transition-colors min-h-0 border border-transparent hover:border-border/40">
      <Image
        src={getWeatherIconUrl(day.icon, "2x")}
        alt={day.description}
        width={64}
        height={64}
        loading="eager"
        className="shrink-0 drop-shadow-md"
        title={day.description}
      />
      <div className="flex-1 min-w-0">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide leading-none">
          {formatDate(day.date)}
        </p>
        <div className="flex items-baseline gap-2 mt-1">
          <span className="text-xl font-bold leading-none">{formatTemperature(day.tempMax)}</span>
          <span className="text-sm text-muted-foreground">{formatTemperature(day.tempMin)}</span>
        </div>
        <p className="text-xs text-muted-foreground/70 capitalize truncate mt-0.5">
          {day.description}
        </p>
      </div>
      {day.pop > 0.1 && (
        <div className="flex flex-col items-center gap-0.5 text-blue-400 shrink-0">
          <Droplets className="h-4 w-4" />
          <span className="text-xs font-semibold">{Math.round(day.pop * 100)}%</span>
        </div>
      )}
    </div>
  );
}

// ── Horizontal card (original, for grid) ──────────────────────────────────
function ForecastDayCard({ day }: { day: ForecastDay }) {
  return (
    <div className="flex flex-col items-center rounded-xl bg-muted/40 p-3 text-center hover:bg-muted/60 transition-colors">
      <p className="text-xs font-medium text-muted-foreground">
        {formatDate(day.date)}
      </p>
      <Image
        src={getWeatherIconUrl(day.icon, "2x")}
        alt={day.description}
        width={48}
        height={48}
        loading="eager"
        className="my-1 drop-shadow"
        title={day.description}
      />
      <p className="text-sm font-bold">{formatTemperature(day.tempMax)}</p>
      <p className="text-xs text-muted-foreground">{formatTemperature(day.tempMin)}</p>
      {day.pop > 0.1 && (
        <div className="mt-1 flex items-center gap-0.5 text-blue-400 text-xs">
          <Droplets className="h-3 w-3" />
          {Math.round(day.pop * 100)}%
        </div>
      )}
    </div>
  );
}
