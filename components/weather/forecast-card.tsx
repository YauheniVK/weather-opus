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
}

export function ForecastCard({ forecast, isPremium }: ForecastCardProps) {
  // Free users see 2 days (today + tomorrow), premium see all 7
  const visibleDays = isPremium ? forecast : forecast.slice(0, 2);
  const lockedDays = isPremium ? [] : forecast.slice(2);

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

          {/* Locked days for free users */}
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
