import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatTemperature(temp: number, unit: "C" | "F" = "C"): string {
  if (unit === "F") {
    return `${Math.round((temp * 9) / 5 + 32)}°F`;
  }
  return `${Math.round(temp)}°C`;
}

export function formatWindSpeed(speed: number): string {
  return `${Math.round(speed)} m/s`;
}

export function formatPressure(pressure: number): string {
  return `${pressure} hPa`;
}

export function formatHumidity(humidity: number): string {
  return `${humidity}%`;
}

export function formatVisibility(visibility: number): string {
  if (visibility >= 1000) {
    return `${(visibility / 1000).toFixed(1)} km`;
  }
  return `${visibility} m`;
}

export function formatTime(timestamp: number, timezone: number): string {
  const date = new Date((timestamp + timezone) * 1000);
  const hours = date.getUTCHours().toString().padStart(2, "0");
  const minutes = date.getUTCMinutes().toString().padStart(2, "0");
  return `${hours}:${minutes}`;
}

export function getWindDirection(deg: number): string {
  const directions = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"];
  return directions[Math.round(deg / 45) % 8];
}

export function formatCurrency(amount: number, decimals = 4): string {
  return amount.toFixed(decimals);
}

export function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

export function formatSubscriptionDate(dateStr: string | null): string {
  if (!dateStr) return "—";
  return new Date(dateStr).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

export function isPremiumExpired(subscriptionEnd: string | null): boolean {
  if (!subscriptionEnd) return true;
  return new Date(subscriptionEnd) < new Date();
}

export function isActivePremium(
  status: string,
  subscriptionEnd: string | null
): boolean {
  if (status !== "premium") return false;
  if (!subscriptionEnd) return true; // no expiry = admin-granted, treat as active
  return !isPremiumExpired(subscriptionEnd);
}

export function getWeatherIconUrl(icon: string, size: "1x" | "2x" | "4x" = "2x"): string {
  return `https://openweathermap.org/img/wn/${icon}@${size}.png`;
}

export function uvIndexLabel(uvi: number): { label: string; color: string } {
  if (uvi < 3) return { label: "Low", color: "text-green-500" };
  if (uvi < 6) return { label: "Moderate", color: "text-yellow-500" };
  if (uvi < 8) return { label: "High", color: "text-orange-500" };
  if (uvi < 11) return { label: "Very High", color: "text-red-500" };
  return { label: "Extreme", color: "text-purple-500" };
}

export function convertCurrency(
  amount: number,
  fromCode: string,
  toCode: string,
  rates: Record<string, { rate: number; scale: number }>
): number {
  if (fromCode === "BYN" && toCode === "BYN") return amount;

  let amountInByn: number;
  if (fromCode === "BYN") {
    amountInByn = amount;
  } else {
    const fromRate = rates[fromCode];
    if (!fromRate) throw new Error(`Rate not found for ${fromCode}`);
    amountInByn = (amount / fromRate.scale) * fromRate.rate;
  }

  if (toCode === "BYN") return amountInByn;

  const toRate = rates[toCode];
  if (!toRate) throw new Error(`Rate not found for ${toCode}`);
  return (amountInByn / toRate.rate) * toRate.scale;
}
