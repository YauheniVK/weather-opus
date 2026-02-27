"use client";

import { useEffect, useState } from "react";
import { SOLAR_FLARES, GEOMAGNETIC_STORM } from "@/lib/mockData";
import type { SolarFlare, StormColor } from "@/types/space";

// ─── Types ────────────────────────────────────────────────────────────────────
interface DonkiFlare {
  flareClass: string;
  time:       string;
  region:     string;
  duration:   number | null;
}

interface DonkiStorm {
  level:       string;
  description: string;
  color:       StormColor;
}

interface DonkiData {
  flares:    DonkiFlare[];
  storm:     DonkiStorm;
  fetchedAt: string;
}

// ─── Flare class → color token ────────────────────────────────────────────────
function flareColors(flareClass: string): { badge: string; dot: string } {
  const letter = flareClass.charAt(0).toUpperCase();
  switch (letter) {
    case "X":
      return { badge: "bg-red-500/10 border-red-500/30 text-red-400",    dot: "bg-red-400"    };
    case "M":
      return { badge: "bg-orange-500/10 border-orange-500/30 text-orange-400", dot: "bg-orange-400" };
    case "C":
      return { badge: "bg-yellow-500/10 border-yellow-500/30 text-yellow-400", dot: "bg-yellow-400" };
    default:
      return { badge: "bg-green-500/10 border-green-500/30 text-green-400",  dot: "bg-green-400"  };
  }
}

// ─── Geomagnetic storm → style token ──────────────────────────────────────────
const STORM_STYLES: Record<StormColor, { border: string; text: string; badge: string; dot: string }> = {
  green:  {
    border: "border-green-500/25",
    text:   "text-green-400",
    badge:  "bg-green-500/10 text-green-400",
    dot:    "bg-green-400",
  },
  yellow: {
    border: "border-yellow-500/25",
    text:   "text-yellow-400",
    badge:  "bg-yellow-500/10 text-yellow-400",
    dot:    "bg-yellow-400",
  },
  red:    {
    border: "border-red-500/25",
    text:   "text-red-400",
    badge:  "bg-red-500/10 text-red-400",
    dot:    "bg-red-400",
  },
};

// ─── Flare row ────────────────────────────────────────────────────────────────
function FlareRow({ flare }: { flare: DonkiFlare }) {
  const colors = flareColors(flare.flareClass);
  const label  = flare.time
    ? new Date(flare.time).toLocaleString("ru-RU", {
        month: "short", day: "numeric",
        hour: "2-digit", minute: "2-digit", timeZone: "UTC",
      }) + " UTC"
    : "—";

  return (
    <div className="flex items-center gap-3 rounded-lg bg-white/5 px-4 py-3">
      <span className={`shrink-0 rounded border px-2 py-0.5 text-xs font-bold font-mono ${colors.badge}`}>
        {flare.flareClass}
      </span>
      <div className="flex-1 min-w-0">
        <p className="text-sm text-white/80 truncate">{label}</p>
        <p className="text-xs text-white/40">Регион {flare.region}</p>
      </div>
      {flare.duration != null && (
        <span className="shrink-0 text-xs text-white/40 font-mono">{flare.duration} мин</span>
      )}
      <span className={`shrink-0 h-2 w-2 rounded-full ${colors.dot}`} />
    </div>
  );
}

// ─── Skeleton row ─────────────────────────────────────────────────────────────
function SkeletonRow() {
  return (
    <div className="flex items-center gap-3 rounded-lg bg-white/5 px-4 py-3 animate-pulse">
      <div className="h-6 w-12 rounded bg-white/10" />
      <div className="flex-1 space-y-1.5">
        <div className="h-3 w-32 rounded bg-white/10" />
        <div className="h-2 w-20 rounded bg-white/10" />
      </div>
      <div className="h-2 w-2 rounded-full bg-white/10" />
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────
export function SolarActivity() {
  const [data,    setData]    = useState<DonkiData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/donki")
      .then((r) => r.ok ? r.json() : Promise.reject(r.status))
      .then((json: DonkiData) => { if (!cancelled) { setData(json); setLoading(false); } })
      .catch(() => {
        if (!cancelled) {
          // Fallback to mock data on error
          setData({
            flares: SOLAR_FLARES.map((f) => ({ ...f, duration: f.duration ?? null })),
            storm:  GEOMAGNETIC_STORM,
            fetchedAt: "",
          });
          setLoading(false);
        }
      });
    return () => { cancelled = true; };
  }, []);

  const flares = data?.flares ?? [];
  const storm  = data?.storm  ?? GEOMAGNETIC_STORM;
  const styles = STORM_STYLES[storm.color];

  return (
    <div className="grid gap-4 lg:grid-cols-3">

      {/* ── Flares panel ─────────────────────────────────────────────────── */}
      <div className="lg:col-span-2 space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold uppercase tracking-widest text-amber-400/70">
            Солнечная активность
          </h2>
          {data?.fetchedAt && (
            <span className="text-[10px] text-white/25 font-mono">
              NASA DONKI · {new Date(data.fetchedAt).toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" })}
            </span>
          )}
        </div>
        <p className="text-xs text-white/40">Вспышки за последние 7 дней</p>
        <div className="space-y-2">
          {loading ? (
            [0, 1, 2].map((i) => <SkeletonRow key={i} />)
          ) : flares.length === 0 ? (
            <p className="rounded-lg bg-white/5 px-4 py-4 text-sm text-white/40 text-center">
              Вспышек не зафиксировано
            </p>
          ) : (
            flares.map((f, i) => <FlareRow key={i} flare={f} />)
          )}
        </div>
      </div>

      {/* ── Storm card ───────────────────────────────────────────────────── */}
      <div className={`rounded-xl border ${styles.border} bg-white/5 p-5 flex flex-col justify-center space-y-3`}>
        <div className="flex items-center justify-between">
          <p className="text-xs text-white/40 uppercase tracking-widest">Геомагнитная буря</p>
          {loading && <div className="h-2 w-2 rounded-full bg-white/20 animate-pulse" />}
        </div>

        <div className="flex items-center gap-3">
          <span
            className={`h-3 w-3 rounded-full ${styles.dot}`}
            style={{ boxShadow: `0 0 8px 2px currentColor` }}
          />
          <span className={`text-3xl font-bold ${styles.text}`}>{storm.level}</span>
        </div>

        <p className={`text-sm font-medium ${styles.text}`}>{storm.description}</p>

        <div className={`rounded-lg ${styles.badge} px-3 py-2 text-xs`}>
          {storm.level === "G0"
            ? "Геомагнитная обстановка спокойная"
            : `Уровень ${storm.level} — воздействие на спутники и электросети`}
        </div>
      </div>

    </div>
  );
}
