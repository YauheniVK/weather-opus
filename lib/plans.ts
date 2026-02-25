/**
 * Client-safe plan configuration.
 * Does NOT import stripe or server-only env vars.
 */
export interface PlanDisplay {
  id: "monthly" | "annual";
  name: string;
  price: number;
  interval: "month" | "year";
  savings?: string;
}

export const PLAN_DISPLAY: PlanDisplay[] = [
  {
    id: "monthly",
    name: "Premium Monthly",
    price: 9.99,
    interval: "month",
  },
  {
    id: "annual",
    name: "Premium Annual",
    price: 79.99,
    interval: "year",
    savings: "Save 33%",
  },
];

export const ALL_FEATURES = [
  { text: "Real-time weather data", free: true },
  { text: "2-day weather forecast", free: true },
  { text: "NBRB rates: USD, EUR, PLN, RUB, CNY", free: true },
  { text: "Currency converter", free: true },
  { text: "Weather search by city", free: true },
  { text: "Geolocation support", free: true },
  { text: "7-day extended forecast", free: false },
  { text: "All NBRB exchange rates", free: false },
  { text: "Cross-currency rates panel", free: false },
  { text: "Ad-free experience", free: false },
  { text: "Save up to 10 cities", free: false },
  { text: "Priority email support", free: false },
] as const;
