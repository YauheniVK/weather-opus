/**
 * Client-safe plan configuration.
 * Does NOT import stripe or server-only env vars.
 */
export interface PlanDisplay {
  id: "premium-monthly" | "premium-annual" | "elite-monthly" | "elite-annual";
  tier: "premium" | "elite";
  name: string;
  price: number;
  interval: "month" | "year";
  savings?: string;
}

export const PLAN_DISPLAY: PlanDisplay[] = [
  {
    id: "premium-monthly",
    tier: "premium",
    name: "Premium Monthly",
    price: 5.99,
    interval: "month",
  },
  {
    id: "premium-annual",
    tier: "premium",
    name: "Premium Annual",
    price: 59.90,
    interval: "year",
    savings: "Save 17%",
  },
  {
    id: "elite-monthly",
    tier: "elite",
    name: "Elite Monthly",
    price: 19.99,
    interval: "month",
  },
  {
    id: "elite-annual",
    tier: "elite",
    name: "Elite Annual",
    price: 199.90,
    interval: "year",
    savings: "Save 17%",
  },
];

/** tier → "free" | "premium" | "elite" for each feature row */
export const ALL_FEATURES = [
  { text: "Real-time weather data",             tier: "free"    as const },
  { text: "2-day weather forecast",             tier: "free"    as const },
  { text: "NBRB rates: USD, EUR, PLN, RUB, CNY", tier: "free"  as const },
  { text: "Weather map",                        tier: "free"    as const },
  { text: "Weather search by city",             tier: "free"    as const },
  { text: "Geolocation support",                tier: "free"    as const },
  { text: "7-day extended forecast",            tier: "premium" as const },
  { text: "Currency converter",                 tier: "premium" as const },
  { text: "All NBRB exchange rates",            tier: "premium" as const },
  { text: "Cross-currency rates panel",         tier: "premium" as const },
  { text: "Space weather panel",                tier: "premium" as const },
  { text: "Solar system — static mode",         tier: "premium" as const },
  { text: "NASA ephemeris animation",           tier: "elite"   as const },
  { text: "Astronomy Photo of the Day",         tier: "elite"   as const },
] as const;
