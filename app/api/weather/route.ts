import { NextRequest, NextResponse } from "next/server";
import { getServerProfile } from "@/lib/auth-server";
import type { WeatherData, ForecastDay } from "@/types";

const OWM_BASE = "https://api.openweathermap.org/data/2.5";

interface OWMCurrentResponse {
  name: string;
  coord: { lat: number; lon: number };
  sys: { country: string; sunrise: number; sunset: number };
  main: { temp: number; feels_like: number; humidity: number; pressure: number };
  wind: { speed: number; deg: number };
  weather: { description: string; icon: string }[];
  visibility: number;
  timezone: number;
}

interface OWMForecastItem {
  dt: number;
  dt_txt: string;
  main: { temp_min: number; temp_max: number; humidity: number };
  wind: { speed: number };
  weather: { description: string; icon: string }[];
  pop: number;
}

interface OWMForecastResponse {
  list: OWMForecastItem[];
}

function processForecast(list: OWMForecastItem[]): ForecastDay[] {
  const byDate = new Map<string, OWMForecastItem[]>();
  for (const item of list) {
    const date = item.dt_txt.split(" ")[0];
    if (!byDate.has(date)) byDate.set(date, []);
    byDate.get(date)!.push(item);
  }
  const today = new Date().toISOString().split("T")[0];
  return Array.from(byDate.entries())
    .filter(([date]) => date > today)
    .slice(0, 7)
    .map(([date, items]) => {
      const noon = items.find((i) => i.dt_txt.includes("12:00")) ?? items[0];
      return {
        date,
        dateTimestamp: noon.dt,
        tempMin: Math.min(...items.map((i) => i.main.temp_min)),
        tempMax: Math.max(...items.map((i) => i.main.temp_max)),
        description: noon.weather[0]?.description ?? "",
        icon: noon.weather[0]?.icon ?? "01d",
        humidity: noon.main.humidity,
        windSpeed: noon.wind.speed,
        pop: noon.pop,
      };
    });
}

export async function GET(request: NextRequest) {
  const profile = await getServerProfile();
  if (!profile) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const city = searchParams.get("city");
  const lat = searchParams.get("lat");
  const lon = searchParams.get("lon");

  if (!city && (!lat || !lon)) {
    return NextResponse.json({ error: "Provide 'city' or 'lat'+'lon'" }, { status: 400 });
  }

  const apiKey = process.env.OPENWEATHER_API_KEY;
  if (!apiKey) return NextResponse.json({ error: "Weather API key not configured" }, { status: 500 });

  const q = lat && lon ? `lat=${lat}&lon=${lon}` : `q=${encodeURIComponent(city!)}`;
  const common = `${q}&appid=${apiKey}&units=metric`;

  try {
    const [curRes, frcRes] = await Promise.all([
      fetch(`${OWM_BASE}/weather?${common}`, { next: { revalidate: 600 } }),
      fetch(`${OWM_BASE}/forecast?${common}`, { next: { revalidate: 600 } }),
    ]);

    if (!curRes.ok) {
      return NextResponse.json(
        { error: curRes.status === 404 ? "City not found" : "Weather API error" },
        { status: curRes.status === 404 ? 404 : 502 }
      );
    }

    const [cur, frc]: [OWMCurrentResponse, OWMForecastResponse] = await Promise.all([
      curRes.json(), frcRes.json(),
    ]);

    const data: WeatherData = {
      city: cur.name,
      country: cur.sys.country,
      temperature: cur.main.temp,
      feelsLike: cur.main.feels_like,
      humidity: cur.main.humidity,
      pressure: cur.main.pressure,
      windSpeed: cur.wind.speed,
      windDirection: cur.wind.deg,
      description: cur.weather[0]?.description ?? "",
      icon: cur.weather[0]?.icon ?? "01d",
      visibility: cur.visibility,
      sunrise: cur.sys.sunrise,
      sunset: cur.sys.sunset,
      timezone: cur.timezone,
      lat: cur.coord.lat,
      lon: cur.coord.lon,
      forecast: processForecast(frc.list),
    };

    return NextResponse.json(data);
  } catch (e) {
    console.error("Weather error:", e);
    return NextResponse.json({ error: "Failed to fetch weather" }, { status: 500 });
  }
}
