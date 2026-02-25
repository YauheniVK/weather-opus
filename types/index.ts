// ─── Database Profile ─────────────────────────────────────────────────────────
export interface UserProfile {
  id: string;
  email: string;
  name: string | null;
  image: string | null;
  role: "user" | "admin";
  subscription_status: "free" | "premium";
  subscription_start: string | null;
  subscription_end: string | null;
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
  is_blocked: boolean;
  created_at: string;
  updated_at: string;
}

// ─── Weather ──────────────────────────────────────────────────────────────────
export interface WeatherData {
  city: string;
  country: string;
  temperature: number;
  feelsLike: number;
  humidity: number;
  pressure: number;
  windSpeed: number;
  windDirection: number;
  description: string;
  icon: string;
  visibility: number;
  sunrise: number;
  sunset: number;
  timezone: number;
  lat: number;
  lon: number;
  forecast: ForecastDay[];
}

export interface ForecastDay {
  date: string;
  dateTimestamp: number;
  tempMin: number;
  tempMax: number;
  description: string;
  icon: string;
  humidity: number;
  windSpeed: number;
  pop: number;
}

// ─── Currency ─────────────────────────────────────────────────────────────────
export interface CurrencyRate {
  Cur_ID: number;
  Date: string;
  Cur_Abbreviation: string;
  Cur_Scale: number;
  Cur_Name: string;
  Cur_OfficialRate: number;
}

export interface ProcessedRate {
  code: string;
  name: string;
  nameEn: string;
  scale: number;
  rate: number;
  ratePerUnit: number;
  flag: string;
}

// ─── Stripe ───────────────────────────────────────────────────────────────────
export interface SubscriptionPlan {
  id: "monthly" | "annual";
  name: string;
  price: number;
  interval: "month" | "year";
  priceId: string;
  features: string[];
  savings?: string;
}

// ─── Admin ────────────────────────────────────────────────────────────────────
export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}
