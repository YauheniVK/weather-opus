import { NextRequest, NextResponse } from "next/server";
import { getServerProfile } from "@/lib/auth-server";

export async function GET(request: NextRequest) {
  const profile = await getServerProfile();
  if (!profile) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const layer = searchParams.get("layer");
  const z = searchParams.get("z");
  const x = searchParams.get("x");
  const y = searchParams.get("y");

  if (!layer || !z || !x || !y) {
    return NextResponse.json({ error: "Missing required params: layer, z, x, y" }, { status: 400 });
  }

  const allowedLayers = ["temp_new", "clouds_new", "precipitation_new"];
  if (!allowedLayers.includes(layer)) {
    return NextResponse.json({ error: "Invalid layer" }, { status: 400 });
  }

  const apiKey = process.env.OPENWEATHER_API_KEY;
  if (!apiKey) return NextResponse.json({ error: "Weather API key not configured" }, { status: 500 });

  const tileUrl = `https://tile.openweathermap.org/map/${layer}/${z}/${x}/${y}.png?appid=${apiKey}`;

  try {
    const res = await fetch(tileUrl, { next: { revalidate: 300 } });
    if (!res.ok) {
      return new NextResponse(null, { status: res.status });
    }
    const buffer = await res.arrayBuffer();
    return new NextResponse(buffer, {
      headers: {
        "Content-Type": "image/png",
        "Cache-Control": "public, max-age=300",
      },
    });
  } catch (e) {
    console.error("Tile proxy error:", e);
    return NextResponse.json({ error: "Failed to fetch tile" }, { status: 500 });
  }
}
