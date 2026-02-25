import { NextRequest, NextResponse } from "next/server";
import { getServerProfile } from "@/lib/auth-server";
import type { NASAApodData } from "@/types";

export async function GET(request: NextRequest) {
  const profile = await getServerProfile();
  if (!profile) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const apiKey = process.env.NASA_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "NASA API key not configured" }, { status: 500 });
  }

  const { searchParams } = new URL(request.url);
  const date = searchParams.get("date");

  // Build URL — if no date is provided, NASA returns today's APOD
  const dateParam = date ? `&date=${encodeURIComponent(date)}` : "";
  const url = `https://api.nasa.gov/planetary/apod?api_key=${apiKey}${dateParam}`;

  try {
    const res = await fetch(url, { next: { revalidate: 3600 } });

    if (!res.ok) {
      const body = await res.text();
      console.error("NASA APOD error:", res.status, body);
      return NextResponse.json(
        { error: res.status === 400 ? "Invalid date" : "NASA API error" },
        { status: res.status === 400 ? 400 : 502 }
      );
    }

    const raw = await res.json();

    const data: NASAApodData = {
      date: raw.date,
      title: raw.title,
      explanation: raw.explanation,
      url: raw.url,
      hdurl: raw.hdurl,
      media_type: raw.media_type === "video" ? "video" : "image",
      copyright: raw.copyright ? raw.copyright.trim() : undefined,
    };

    return NextResponse.json(data);
  } catch (e) {
    console.error("NASA APOD fetch error:", e);
    return NextResponse.json({ error: "Failed to fetch APOD" }, { status: 500 });
  }
}
