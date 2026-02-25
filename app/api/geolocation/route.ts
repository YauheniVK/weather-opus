import { NextRequest, NextResponse } from "next/server";
import { getServerProfile } from "@/lib/auth-server";
import type { GeolocationData } from "@/types";

export async function GET(request: NextRequest) {
  const profile = await getServerProfile();
  if (!profile) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const apiKey = process.env.IPGEOLOCATION_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "Geolocation API key not configured" }, { status: 500 });
  }

  // Extract the real client IP from proxy headers
  const forwarded = request.headers.get("x-forwarded-for");
  const realIp = request.headers.get("x-real-ip");
  const clientIp = forwarded ? forwarded.split(",")[0].trim() : (realIp ?? "");

  // If clientIp is a loopback address (dev mode), omit it so ipgeolocation
  // uses the server's own public IP instead of returning an error
  const isLoopback =
    clientIp === "127.0.0.1" ||
    clientIp === "::1" ||
    clientIp === "localhost" ||
    clientIp === "";

  const ipParam = isLoopback ? "" : `&ip=${encodeURIComponent(clientIp)}`;
  const url = `https://api.ipgeolocation.io/ipgeo?apiKey=${apiKey}${ipParam}`;

  try {
    const res = await fetch(url, { next: { revalidate: 3600 } });

    if (!res.ok) {
      const body = await res.text();
      console.error("ipgeolocation error:", res.status, body);
      return NextResponse.json({ error: "Geolocation API error" }, { status: 502 });
    }

    const raw = await res.json();

    const data: GeolocationData = {
      ip: raw.ip ?? "",
      city: raw.city ?? "",
      country: raw.country_name ?? "",
      countryCode: raw.country_code2 ?? "",
      lat: parseFloat(raw.latitude ?? "0"),
      lon: parseFloat(raw.longitude ?? "0"),
      timezone: raw.time_zone?.name ?? "",
    };

    return NextResponse.json(data);
  } catch (e) {
    console.error("Geolocation fetch error:", e);
    return NextResponse.json({ error: "Failed to fetch geolocation" }, { status: 500 });
  }
}
