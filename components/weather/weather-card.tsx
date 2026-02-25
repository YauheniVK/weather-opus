"use client";

import Image from "next/image";
import {
  Droplets,
  Wind,
  Gauge,
  Eye,
  Sunrise,
  Sunset,
  Thermometer,
  Navigation,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import {
  formatTemperature,
  formatWindSpeed,
  formatPressure,
  formatHumidity,
  formatVisibility,
  formatTime,
  getWindDirection,
  getWeatherIconUrl,
} from "@/lib/utils";
import type { WeatherData } from "@/types";

interface WeatherCardProps {
  data: WeatherData;
}

interface StatItemProps {
  icon: React.ReactNode;
  label: string;
  value: string;
}

function StatItem({ icon, label, value }: StatItemProps) {
  return (
    <div className="flex items-center gap-3 rounded-lg bg-muted/50 p-3">
      <div className="text-blue-400">{icon}</div>
      <div>
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="text-sm font-semibold">{value}</p>
      </div>
    </div>
  );
}

export function WeatherCard({ data }: WeatherCardProps) {
  const {
    city,
    country,
    temperature,
    feelsLike,
    humidity,
    pressure,
    windSpeed,
    windDirection,
    description,
    icon,
    visibility,
    sunrise,
    sunset,
    timezone,
  } = data;

  return (
    <Card className="overflow-hidden bg-gradient-to-br from-blue-500/10 via-background to-cyan-500/5 border-blue-500/20">
      <CardContent className="p-6">
        {/* Location & Main */}
        <div className="flex items-start justify-between mb-6">
          <div>
            <h2 className="text-2xl font-bold">
              {city}
              <span className="ml-2 text-lg text-muted-foreground font-normal">
                {country}
              </span>
            </h2>
            <p className="text-muted-foreground capitalize mt-0.5">{description}</p>
          </div>
          <Image
            src={getWeatherIconUrl(icon, "4x")}
            alt={description}
            width={80}
            height={80}
            className="drop-shadow-lg"
          />
        </div>

        {/* Temperature */}
        <div className="flex items-end gap-4 mb-6">
          <div className="text-7xl font-thin tracking-tighter">
            {formatTemperature(temperature)}
          </div>
          <div className="mb-2 text-muted-foreground">
            <div className="flex items-center gap-1 text-sm">
              <Thermometer className="h-3.5 w-3.5 text-orange-400" />
              Feels like {formatTemperature(feelsLike)}
            </div>
          </div>
        </div>

        {/* Stats grid */}
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          <StatItem
            icon={<Droplets className="h-4 w-4" />}
            label="Humidity"
            value={formatHumidity(humidity)}
          />
          <StatItem
            icon={<Wind className="h-4 w-4" />}
            label="Wind"
            value={`${formatWindSpeed(windSpeed)} ${getWindDirection(windDirection)}`}
          />
          <StatItem
            icon={<Gauge className="h-4 w-4" />}
            label="Pressure"
            value={formatPressure(pressure)}
          />
          <StatItem
            icon={<Eye className="h-4 w-4" />}
            label="Visibility"
            value={formatVisibility(visibility)}
          />
        </div>

        {/* Sunrise / Sunset */}
        <div className="mt-4 flex gap-3">
          <div className="flex flex-1 items-center gap-2 rounded-lg bg-gradient-to-r from-amber-500/10 to-orange-500/10 border border-amber-500/20 p-3">
            <Sunrise className="h-4 w-4 text-amber-400" />
            <div>
              <p className="text-xs text-muted-foreground">Sunrise</p>
              <p className="text-sm font-semibold">{formatTime(sunrise, timezone)}</p>
            </div>
          </div>
          <div className="flex flex-1 items-center gap-2 rounded-lg bg-gradient-to-r from-orange-500/10 to-red-500/10 border border-orange-500/20 p-3">
            <Sunset className="h-4 w-4 text-orange-400" />
            <div>
              <p className="text-xs text-muted-foreground">Sunset</p>
              <p className="text-sm font-semibold">{formatTime(sunset, timezone)}</p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
