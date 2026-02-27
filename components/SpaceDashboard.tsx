"use client";

import { useState, useMemo, useEffect, useRef, useCallback } from "react";
import { SolarSystemMap, ANIM_DURATIONS } from "@/components/SolarSystemMap";
import type { MapMode }        from "@/components/SolarSystemMap";
import { VoyagerTracker }      from "@/components/VoyagerTracker";
import { SolarActivity }       from "@/components/SolarActivity";
import { DataLoader }          from "@/components/DataLoader";
import { AnimationControls }   from "@/components/AnimationControls";
import { PLANETS, VOYAGERS, JPL_EPOCH, JPL_ECL_LON } from "@/lib/mockData";
import { getEclipticLongitude, getPlanetSVGAngle } from "@/lib/planetPositions";
import { useAnimation }        from "@/hooks/useAnimation";
import type { SpaceDataset, SpacePoint } from "@/types/space";

// ─── Module-level constants ───────────────────────────────────────────────────
const TODAY_ISO = new Date().toISOString().slice(0, 10);

function mod360(x: number): number { return ((x % 360) + 360) % 360; }

/**
 * Per-planet formula→JPL correction offset (degrees), computed once at module load.
 * correction[planet] = JPL_ECL_LON[planet] - getEclipticLongitude(planet, JPL_EPOCH)
 * Applied in static/animate modes so positions match verified JPL values.
 */
const JPL_CORRECTION: Record<string, number> = (() => {
  const c: Record<string, number> = {};
  for (const key of Object.keys(JPL_ECL_LON)) {
    c[key] = mod360(JPL_ECL_LON[key] - getEclipticLongitude(key, JPL_EPOCH));
  }
  return c;
})();

// Day-of-year for today (0-indexed: Jan 1 = 0)
const TODAY_DOY = (() => {
  const t = new Date();
  return Math.floor((t.getTime() - new Date(t.getFullYear(), 0, 1).getTime()) / 86400000);
})();

// ─── CSS star field ────────────────────────────────────────────────────────────
function buildStarShadows(count: number): string {
  const shadows: string[] = [];
  for (let i = 0; i < count; i++) {
    const x  = Math.abs(Math.round(Math.sin(i * 127.1 + 311.7) * 960 + 960)) % 1920;
    const y  = Math.abs(Math.round(Math.cos(i * 311.7 + 127.1) * 540 + 540)) % 1080;
    const op = (0.18 + (i % 6) * 0.05).toFixed(2); // 0.18–0.43, subtle grain
    shadows.push(`${x}px ${y}px 0 0 rgba(255,255,255,${op})`);
  }
  return shadows.join(", ");
}
const STAR_SHADOWS = buildStarShadows(220);
const STAR_CSS = `
.space-starfield::before {
  content: '';
  position: absolute;
  top: 0; left: 0;
  width: 1px; height: 1px;
  pointer-events: none;
  z-index: 0;
  box-shadow: ${STAR_SHADOWS};
}
`;

// ─── Calendar helpers ─────────────────────────────────────────────────────────
const MONTH_NAMES_RU = [
  "Январь", "Февраль", "Март", "Апрель", "Май", "Июнь",
  "Июль", "Август", "Сентябрь", "Октябрь", "Ноябрь", "Декабрь",
];
const MONTH_DAYS = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];

function dayOfYearToMonthIndex(day: number): number {
  const d = ((Math.floor(day) % 365) + 365) % 365;
  let acc = 0;
  for (let i = 0; i < 12; i++) {
    acc += MONTH_DAYS[i];
    if (d < acc) return i;
  }
  return 11;
}

// Calendar seasons (boundaries: Mar 1 = day 59, Jun 1 = 151, Sep 1 = 243, Dec 1 = 334)
function seasonFromDayOfYear(doy: number): { name: string; color: string } {
  const d = ((Math.floor(doy) % 365) + 365) % 365;
  if (d < 59 || d >= 334) return { name: "Зима",  color: "text-sky-300"    };
  if (d < 151)            return { name: "Весна", color: "text-green-400"  };
  if (d < 243)            return { name: "Лето",  color: "text-yellow-400" };
  return                         { name: "Осень", color: "text-orange-400" };
}

// ─── Mode button ──────────────────────────────────────────────────────────────
function ModeButton({ label, active, onClick }: {
  label: string; active: boolean; onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={[
        "px-3 py-1 rounded-md text-xs font-medium transition-colors",
        active
          ? "bg-blue-500/20 text-blue-300 border border-blue-500/40"
          : "text-white/40 hover:text-white/70 border border-transparent",
      ].join(" ")}
    >
      {label}
    </button>
  );
}

// ─── Earth info block ─────────────────────────────────────────────────────────
function EarthInfoBlock({
  liveSVGAngle,
  displayDate,
  mode,
}: {
  liveSVGAngle: number;   // live SVG rotation angle (animated in animate mode)
  displayDate:  string;
  mode:         MapMode;
}) {
  // Ecliptic longitude from SVG angle
  const lon = (((-liveSVGAngle) % 360) + 360) % 360;

  // Day-of-year:
  //   animate mode → derived from live ecliptic longitude (always in sync with Earth's position)
  //   static/date  → derived from displayDate
  // Earth at ecl=180° ≈ vernal equinox ≈ Mar 20 = day 79 of year.
  let dayOfYear: number;
  if (mode === "animate") {
    dayOfYear = ((79 + (lon - 180) / 360 * 365.25) % 365.25 + 365.25) % 365.25;
  } else {
    const d = new Date(displayDate);
    dayOfYear = Math.floor(
      (d.getTime() - new Date(d.getFullYear(), 0, 1).getTime()) / 86400000
    );
  }

  const monthIdx = dayOfYearToMonthIndex(dayOfYear);
  const weekNum  = Math.floor(dayOfYear / 7) + 1; // 1–52
  const season   = seasonFromDayOfYear(dayOfYear);

  return (
    <div className="rounded-xl border border-blue-500/20 bg-blue-500/5 px-4 py-3 space-y-2">

      {/* Header: Earth image + title */}
      <div className="flex items-center gap-3 mb-1">
        <div
          className="h-10 w-10 rounded-full flex-shrink-0 relative overflow-hidden"
          style={{
            background: "radial-gradient(circle at 35% 35%, #93c5fd 0%, #2563eb 38%, #1d4ed8 58%, #166534 82%, #14532d 100%)",
            boxShadow:  "0 0 16px rgba(59,130,246,0.3), inset -2px -2px 6px rgba(0,0,0,0.45)",
          }}
        >
          <div className="absolute inset-0" style={{ background: "radial-gradient(ellipse at 62% 28%, rgba(255,255,255,0.28) 0%, transparent 52%)" }} />
          <div className="absolute inset-0" style={{ background: "radial-gradient(ellipse at 30% 65%, rgba(255,255,255,0.12) 0%, transparent 45%)" }} />
        </div>
        <div>
          <h3 className="font-semibold text-white text-sm">Земля</h3>
          <p className="text-[10px] text-blue-400/50 font-mono">{displayDate}</p>
        </div>
      </div>

      {/* Ecliptic longitude — live */}
      <div className="flex items-center justify-between gap-4 py-1 border-b border-white/5">
        <span className="text-xs text-white/40">Долгота</span>
        <span className="text-sm font-bold text-blue-400">{Math.round(lon)}°</span>
      </div>

      {/* Season — always shown */}
      <div className="flex items-center justify-between gap-4 py-1 border-b border-white/5">
        <span className="text-xs text-white/40">Сезон</span>
        <span className={`text-sm font-bold ${season.color}`}>{season.name}</span>
      </div>

      {/* Month + week — animate mode only */}
      {mode === "animate" && (
        <>
          <div className="flex items-center justify-between gap-4 py-1 border-b border-white/5">
            <span className="text-xs text-white/40">Месяц</span>
            <span className="text-sm font-bold text-emerald-400">{MONTH_NAMES_RU[monthIdx]}</span>
          </div>
          <div className="flex items-center justify-between gap-4 py-1">
            <span className="text-xs text-white/40">Неделя года</span>
            <span className="text-sm font-bold text-emerald-400">{weekNum}</span>
          </div>
        </>
      )}
    </div>
  );
}

// ─── Dashboard phase type ─────────────────────────────────────────────────────
type DashboardPhase = "idle" | "loading" | "ready" | "playing";

// ─── Voyager trail helper ─────────────────────────────────────────────────────
// Returns up to `maxPts` trail points from a body's dataset up to currentDate.
function buildVoyagerTrails(
  dataset:     SpaceDataset | null,
  currentDate: string,
  maxPts:      number = 365,
): Map<string, SpacePoint[]> {
  const result = new Map<string, SpacePoint[]>();
  if (!dataset) return result;
  for (const body of dataset.bodies) {
    if (body.body !== "Voyager_1" && body.body !== "Voyager_2") continue;
    const key  = body.body === "Voyager_1" ? "Voyager 1" : "Voyager 2";
    const idx  = body.points.findLastIndex((p) => p.date <= currentDate);
    if (idx < 0) continue;
    const start = Math.max(0, idx - maxPts + 1);
    result.set(key, body.points.slice(start, idx + 1));
  }
  return result;
}

// ─── Component ────────────────────────────────────────────────────────────────
export default function SpaceDashboard() {
  // ── Dashboard phase state machine ───────────────────────────────────────────
  // IDLE     → DataLoader form shown
  // LOADING  → DataLoader terminal shown (loading in progress)
  // READY    → DataLoader terminal shown (play button visible)
  // PLAYING  → full animation UI, DataLoader hidden
  const [phase,   setPhase]   = useState<DashboardPhase>("idle");
  const [dataset, setDataset] = useState<SpaceDataset | null>(null);

  const handleDatasetReady = useCallback((data: SpaceDataset) => {
    setDataset(data);
    setPhase("ready");
  }, []);

  const handlePlay = useCallback(() => {
    setPhase("playing");
  }, []);

  const handleReset = useCallback(() => {
    setDataset(null);
    setPhase("idle");
  }, []);

  // ── Real-data animation ──────────────────────────────────────────────────────
  const anim = useAnimation(phase === "playing" ? dataset : null);

  // Auto-start the rAF loop the moment we enter playing phase.
  // animPlayRef keeps the latest `anim.play` without adding it to the dep array
  // (useCallback with [] in useAnimation guarantees it's always the same function).
  const animPlayRef = useRef(anim.play);
  animPlayRef.current = anim.play;
  useEffect(() => {
    if (phase === "playing") animPlayRef.current();
  }, [phase]);

  // ── Voyager trails (last 365 points up to current animation date) ────────────
  const voyagerTrails = useMemo(
    () => buildVoyagerTrails(dataset, anim.currentDate),
    [dataset, anim.currentDate],
  );

  // ── Mock-mode state (when not playing real data) ─────────────────────────────
  const [mode, setMode]                   = useState<MapMode>("animate");
  const [selectedDate, setSelectedDate]   = useState<string>(TODAY_ISO);
  const [animElapsedMs, setAnimElapsedMs] = useState(0);
  const animStartRef = useRef<number>(Date.now());

  useEffect(() => {
    if (mode !== "animate" || phase === "playing") {
      setAnimElapsedMs(0);
      return;
    }
    animStartRef.current = Date.now();
    setAnimElapsedMs(0);
    const id = setInterval(() => {
      setAnimElapsedMs(Date.now() - animStartRef.current);
    }, 100);
    return () => clearInterval(id);
  }, [mode, phase]);

  const displayDate = mode === "date" ? selectedDate : TODAY_ISO;

  const baseAngles = useMemo<Record<string, number>>(() => {
    const r: Record<string, number> = {};
    for (const p of PLANETS) {
      if (mode === "date") {
        r[p.nameEn] = getPlanetSVGAngle(p.nameEn, displayDate);
      } else {
        const fml    = getEclipticLongitude(p.nameEn, TODAY_ISO);
        const eclLon = mod360(fml + (JPL_CORRECTION[p.nameEn] ?? 0));
        r[p.nameEn]  = mod360(-eclLon);
      }
    }
    return r;
  }, [displayDate, mode]);

  const liveAngles = useMemo<Record<string, number>>(() => {
    if (mode !== "animate") return baseAngles;
    const r: Record<string, number> = {};
    for (const p of PLANETS) {
      const dur      = (ANIM_DURATIONS[p.nameEn] ?? 60) * 1000;
      const progress = (animElapsedMs % dur) / dur;
      const start    = baseAngles[p.nameEn] ?? 0;
      r[p.nameEn]    = ((start - progress * 360) % 360 + 360) % 360;
    }
    return r;
  }, [mode, animElapsedMs, baseAngles]);

  const voyagerAngles = useMemo<Record<string, number>>(() => {
    const r: Record<string, number> = {};
    for (const v of VOYAGERS) r[v.name] = v.angle;
    return r;
  }, []);

  const isPlaying = phase === "playing";

  // Earth SVG angle in playing mode — from currentPositions if available
  const earthSVGAngle = isPlaying
    ? (() => {
        const pt = anim.currentPositions?.get("Earth");
        return pt ? (((-pt.angle) % 360) + 360) % 360 : 0;
      })()
    : (liveAngles["Earth"] ?? 0);

  return (
    <>
      <style>{STAR_CSS}</style>

      <div className="space-starfield relative overflow-hidden rounded-xl bg-[#060614] p-5 sm:p-7 space-y-8">

        {/* ── Info banner / phase header ───────────────────────────────────── */}
        {isPlaying ? (
          <div className="relative z-10 flex items-center justify-between gap-3 flex-wrap">
            <div className="flex items-center gap-3 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-2 text-sm text-emerald-300">
              <span>🛸</span>
              <span>
                <strong>NASA JPL Horizons</strong> — реальные данные ·{" "}
                <span className="font-mono">{dataset?.startDate ?? "—"}</span>
                {" → "}
                <span className="font-mono">{dataset?.endDate ?? "—"}</span>
              </span>
            </div>
            <button
              onClick={handleReset}
              className="px-3 py-1.5 rounded-lg border border-white/20 text-xs text-white/50 hover:text-white/80 transition-colors"
            >
              ← Новый диапазон
            </button>
          </div>
        ) : (
          <div className="relative z-10 flex items-start gap-3 rounded-xl border border-blue-500/30 bg-blue-500/10 px-4 py-3 text-sm text-blue-300">
            <span className="text-base shrink-0 mt-0.5">🪐</span>
            <span>
              <strong>Позиции планет</strong> — кеплеровская формула + поправка JPL Horizons (2026-02-27).
              Загрузи исторические данные NASA для полной анимации.
            </span>
          </div>
        )}

        {/* ── Map + right column ──────────────────────────────────────────── */}
        <div className="relative z-10 grid gap-6 lg:grid-cols-3 items-start">

          {/* Map — left 2/3 */}
          <div className="lg:col-span-2 space-y-3">
            {/* Mode selector — only in non-playing mode */}
            {!isPlaying && (
              <div className="flex items-center justify-between gap-3 flex-wrap">
                <h2 className="text-sm font-semibold uppercase tracking-widest text-blue-400/70 shrink-0">
                  Солнечная система
                </h2>
                <div className="flex items-center gap-1">
                  <ModeButton label="Статика"  active={mode === "static"}  onClick={() => setMode("static")}  />
                  <ModeButton label="Анимация" active={mode === "animate"} onClick={() => setMode("animate")} />
                  <ModeButton label="По дате"  active={mode === "date"}    onClick={() => setMode("date")}    />
                  {mode === "date" && (
                    <input
                      type="date"
                      value={selectedDate}
                      onChange={(e) => setSelectedDate(e.target.value)}
                      className="ml-2 rounded-md border border-white/20 bg-white/5 px-2 py-0.5 text-xs text-white/80 focus:outline-none focus:border-blue-500/60"
                    />
                  )}
                </div>
              </div>
            )}

            <div className="rounded-xl overflow-hidden bg-black/40 border border-white/5">
              <SolarSystemMap
                mode={isPlaying ? "static" : mode}
                planetAngles={baseAngles}
                liveAngles={liveAngles}
                voyagerAngles={voyagerAngles}
                currentPositions={isPlaying ? anim.currentPositions : null}
                voyagerTrails={isPlaying ? voyagerTrails : null}
              />
            </div>

            {/* Animation controls in playing mode */}
            {isPlaying && (
              <AnimationControls anim={anim} />
            )}

            <p className="text-xs text-white/30 text-center">
              Орбиты в логарифмическом масштабе · Наведите на планету или орбиту для деталей
            </p>
          </div>

          {/* Right 1/3 */}
          <div className="lg:col-span-1 space-y-4">
            <EarthInfoBlock
              liveSVGAngle={earthSVGAngle}
              displayDate={isPlaying ? (anim.currentDate || displayDate) : displayDate}
              mode={isPlaying ? "animate" : mode}
            />

            {/* DataLoader — hidden in playing mode */}
            {!isPlaying && (
              <div className="rounded-xl border border-white/10 bg-white/5 p-4">
                <DataLoader
                  onComplete={(data) => {
                    handleDatasetReady(data);
                    handlePlay();
                  }}
                />
              </div>
            )}

            <VoyagerTracker />
          </div>
        </div>

        {/* ── Solar activity ─────────────────────────────────────────────── */}
        <div className="relative z-10">
          <SolarActivity />
        </div>
      </div>
    </>
  );
}
