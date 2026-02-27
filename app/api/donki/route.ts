import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const NASA_KEY = process.env.NASA_API_KEY ?? "DEMO_KEY";
const BASE     = "https://api.nasa.gov/DONKI";

function isoDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function kpToStorm(kp: number): { level: string; description: string; color: "green" | "yellow" | "red" } {
  if (kp >= 9) return { level: "G5", description: "Экстремальная буря",  color: "red"    };
  if (kp >= 8) return { level: "G4", description: "Сильная буря",         color: "red"    };
  if (kp >= 7) return { level: "G3", description: "Сильная буря",         color: "red"    };
  if (kp >= 6) return { level: "G2", description: "Умеренная буря",       color: "yellow" };
  if (kp >= 5) return { level: "G1", description: "Слабая буря",          color: "yellow" };
  return              { level: "G0", description: "Спокойно",             color: "green"  };
}

export async function GET() {
  const end   = new Date();
  const start = new Date(end);
  start.setDate(start.getDate() - 7);

  const startDate = isoDate(start);
  const endDate   = isoDate(end);

  try {
    const [flrRes, gstRes] = await Promise.all([
      fetch(`${BASE}/FLR?startDate=${startDate}&endDate=${endDate}&api_key=${NASA_KEY}`,
        { next: { revalidate: 900 } }),
      fetch(`${BASE}/GST?startDate=${startDate}&endDate=${endDate}&api_key=${NASA_KEY}`,
        { next: { revalidate: 900 } }),
    ]);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const flrData: any[] = flrRes.ok ? await flrRes.json() : [];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const gstData: any[] = gstRes.ok ? await gstRes.json() : [];

    // ── Flares: last 5, most recent first ──────────────────────────────────
    const flares = (Array.isArray(flrData) ? flrData : [])
      .slice(-5)
      .reverse()
      .map((f) => {
        const begin = f.beginTime ? new Date(f.beginTime).getTime() : null;
        const end_  = f.endTime   ? new Date(f.endTime).getTime()   : null;
        const duration = begin && end_ ? Math.round((end_ - begin) / 60_000) : null;
        return {
          flareClass: (f.classType as string | undefined) ?? "?",
          time:       (f.beginTime ?? f.peakTime ?? "") as string,
          region:     f.activeRegionNum ? `AR${f.activeRegionNum}` : "—",
          duration,
        };
      });

    // ── Storm: highest Kp index from most recent event ────────────────────
    let storm = kpToStorm(0);
    if (Array.isArray(gstData) && gstData.length > 0) {
      const latest   = gstData[gstData.length - 1];
      const allKp    = Array.isArray(latest.allKpIndex) ? latest.allKpIndex : [];
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const maxKp    = allKp.reduce((m: number, k: any) => Math.max(m, k.kpIndex ?? 0), 0);
      storm = kpToStorm(maxKp);
    }

    return NextResponse.json({
      flares,
      storm,
      fetchedAt: new Date().toISOString(),
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: msg }, { status: 502 });
  }
}
