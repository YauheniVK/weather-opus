"use client";

import { useState, useMemo, useEffect, useRef, useCallback } from "react";
import { SolarSystemMap, ANIM_DURATIONS } from "@/components/SolarSystemMap";
import type { MapMode }        from "@/components/SolarSystemMap";
import { VoyagerTracker }      from "@/components/VoyagerTracker";
import { DataLoader }          from "@/components/DataLoader";
import { AnimationControls }   from "@/components/AnimationControls";
import { PLANETS, PROBES, JPL_EPOCH, JPL_ECL_LON, NASA_IMAGES } from "@/lib/mockData";
import { getEclipticLongitude, getPlanetSVGAngle } from "@/lib/planetPositions";
import { useAnimation }        from "@/hooks/useAnimation";
import type { SpaceDataset, SpacePoint } from "@/types/space";

// ─── Module-level constants ───────────────────────────────────────────────────
const TODAY_ISO = new Date().toISOString().slice(0, 10);

function mod360(x: number): number { return ((x % 360) + 360) % 360; }


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
        "flex-1 px-2 py-1 rounded-md text-xs font-medium transition-colors text-center whitespace-nowrap",
        active
          ? "bg-blue-500/20 text-blue-300 border border-blue-500/40"
          : "text-white/40 hover:text-white/70 border border-transparent",
      ].join(" ")}
    >
      {label}
    </button>
  );
}

const MONTH_GEN_RU = [
  "янв", "фев", "мар", "апр", "мая", "июн",
  "июл", "авг", "сен", "окт", "ноя", "дек",
];
function formatDateBtn(iso: string) {
  const [y, m, d] = iso.split("-").map(Number);
  return `${d} ${MONTH_GEN_RU[m - 1]} ${y}`;
}

// ─── Date picker popup (3 rows: year / month / day) ─────────────────────────
const MONTH_LABELS_RU = [
  "Январь", "Февраль", "Март", "Апрель", "Май", "Июнь",
  "Июль", "Август", "Сентябрь", "Октябрь", "Ноябрь", "Декабрь",
];

function DatePicker({
  value,
  onChange,
  onClose,
}: {
  value: string;
  onChange: (iso: string) => void;
  onClose: () => void;
}) {
  const [y, m, d] = value.split("-").map(Number);
  const daysInMonth = new Date(y, m, 0).getDate();

  // Keep latest values in a ref so interval callbacks always read fresh data
  const valRef = useRef({ y, m, d });
  valRef.current = { y, m, d };

  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  const emitFrom = (ny: number, nm: number, nd: number) => {
    const maxD = new Date(ny, nm, 0).getDate();
    const fd   = Math.min(nd, maxD);
    onChangeRef.current(`${ny}-${String(nm).padStart(2, "0")}-${String(fd).padStart(2, "0")}`);
  };

  // stepFnRef stores a function that reads valRef and applies one step
  type StepFn = (v: { y: number; m: number; d: number }) => void;
  const stepFnRef = useRef<StepFn | null>(null);
  const timerRef  = useRef<ReturnType<typeof setTimeout> | null>(null);
  const ivRef     = useRef<ReturnType<typeof setInterval> | null>(null);

  const clearRepeat = useCallback(() => {
    if (timerRef.current) { clearTimeout(timerRef.current);  timerRef.current = null; }
    if (ivRef.current)    { clearInterval(ivRef.current);    ivRef.current = null; }
    stepFnRef.current = null;
  }, []);

  const holdProps = (stepFn: StepFn) => ({
    onPointerDown: () => {
      stepFn(valRef.current);
      stepFnRef.current = stepFn;
      clearRepeat();
      stepFnRef.current = stepFn;
      timerRef.current = setTimeout(() => {
        ivRef.current = setInterval(() => { stepFnRef.current?.(valRef.current); }, 120);
      }, 400);
    },
    onPointerUp:     clearRepeat,
    onPointerLeave:  clearRepeat,
    onPointerCancel: clearRepeat,
  });

  useEffect(() => clearRepeat, [clearRepeat]);

  // Close on click outside
  const popupRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (popupRef.current && !popupRef.current.contains(e.target as Node)) onClose();
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [onClose]);

  // Step functions — read fresh values from the argument
  const yearDec:  StepFn = (v) => emitFrom(v.y - 1, v.m, v.d);
  const yearInc:  StepFn = (v) => emitFrom(v.y + 1, v.m, v.d);
  const monthDec: StepFn = (v) => emitFrom(v.m === 1 ? v.y - 1 : v.y, v.m === 1 ? 12 : v.m - 1, v.d);
  const monthInc: StepFn = (v) => emitFrom(v.m === 12 ? v.y + 1 : v.y, v.m === 12 ? 1 : v.m + 1, v.d);
  const dayDec: StepFn = (v) => {
    if (v.d <= 1) {
      const pm = v.m === 1 ? 12 : v.m - 1;
      const py = v.m === 1 ? v.y - 1 : v.y;
      emitFrom(py, pm, new Date(py, pm, 0).getDate());
    } else { emitFrom(v.y, v.m, v.d - 1); }
  };
  const dayInc: StepFn = (v) => {
    const max = new Date(v.y, v.m, 0).getDate();
    if (v.d >= max) {
      const nm = v.m === 12 ? 1 : v.m + 1;
      const ny = v.m === 12 ? v.y + 1 : v.y;
      emitFrom(ny, nm, 1);
    } else { emitFrom(v.y, v.m, v.d + 1); }
  };

  const inputCls =
    "w-full rounded-md border border-white/15 bg-white/5 px-2 py-1 text-xs text-white/80 text-center focus:outline-none focus:border-blue-500/50";
  const arrowCls = "text-white/30 hover:text-white/70 text-xs px-1.5 shrink-0";
  const labelCls = "text-[10px] text-white/30 w-10 shrink-0";

  return (
    <div
      ref={popupRef}
      className="absolute top-full left-0 mt-1 z-30 rounded-lg border border-white/15 bg-black/95 backdrop-blur-md px-3 py-2.5 shadow-xl select-none space-y-1.5"
      style={{ width: 220 }}
    >
      {/* Year */}
      <div className="flex items-center gap-1">
        <span className={labelCls}>Год</span>
        <button {...holdProps(yearDec)} className={arrowCls}>◀</button>
        <input
          type="number"
          value={y}
          onChange={(e) => { const v = parseInt(e.target.value); if (v) emitFrom(v, m, d); }}
          className={inputCls}
          style={{ minWidth: 0 }}
        />
        <button {...holdProps(yearInc)} className={arrowCls}>▶</button>
      </div>

      {/* Month */}
      <div className="flex items-center gap-1">
        <span className={labelCls}>Месяц</span>
        <button {...holdProps(monthDec)} className={arrowCls}>◀</button>
        <select
          value={m}
          onChange={(e) => emitFrom(y, parseInt(e.target.value), d)}
          className={inputCls + " appearance-none cursor-pointer"}
          style={{ minWidth: 0 }}
        >
          {MONTH_LABELS_RU.map((label, i) => (
            <option key={i} value={i + 1} className="bg-black text-white">{label}</option>
          ))}
        </select>
        <button {...holdProps(monthInc)} className={arrowCls}>▶</button>
      </div>

      {/* Day */}
      <div className="flex items-center gap-1">
        <span className={labelCls}>День</span>
        <button {...holdProps(dayDec)} className={arrowCls}>◀</button>
        <input
          type="number"
          min={1}
          max={daysInMonth}
          value={d}
          onChange={(e) => { const v = parseInt(e.target.value); if (v >= 1 && v <= daysInMonth) emitFrom(y, m, v); }}
          className={inputCls}
          style={{ minWidth: 0 }}
        />
        <button {...holdProps(dayInc)} className={arrowCls}>▶</button>
      </div>

      {/* Footer: today + confirm */}
      <div className="pt-0.5 flex items-center justify-between">
        <button
          onClick={() => {
            const now = new Date();
            emitFrom(now.getFullYear(), now.getMonth() + 1, now.getDate());
          }}
          className="text-[10px] text-blue-400/70 hover:text-blue-300 transition-colors"
        >
          Сегодня
        </button>
        <button
          onClick={onClose}
          className="flex items-center justify-center w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30 transition-colors text-xs"
          title="Готово"
        >
          ✓
        </button>
      </div>
    </div>
  );
}

// ─── Earth info block ─────────────────────────────────────────────────────────
const EARTH_ANIM_DUR_S = ANIM_DURATIONS["Earth"] ?? 28; // seconds per visual orbit

function EarthInfoBlock({
  liveSVGAngle,
  displayDate,
  mode,
  animOriginDate,
  animElapsedMs,
}: {
  liveSVGAngle:    number;
  displayDate:     string;
  mode:            MapMode;
  animOriginDate?: string;
  animElapsedMs?:  number;
}) {
  // Ecliptic longitude from SVG angle
  const lon = (((-liveSVGAngle) % 360) + 360) % 360;

  // Virtual date for animate mode: origin + elapsed days (1 orbit = 365.25 days)
  const virtualDate = useMemo(() => {
    if (mode !== "animate" || !animOriginDate) return displayDate;
    const elapsed = animElapsedMs ?? 0;
    const elapsedDays = (elapsed / (EARTH_ANIM_DUR_S * 1000)) * 365.25;
    const origin = new Date(animOriginDate);
    origin.setDate(origin.getDate() + Math.floor(elapsedDays));
    return origin.toISOString().slice(0, 10);
  }, [mode, displayDate, animOriginDate, animElapsedMs]);

  const vd = new Date(virtualDate);
  const dayOfYear = Math.floor(
    (vd.getTime() - new Date(vd.getFullYear(), 0, 1).getTime()) / 86400000
  );

  const monthIdx = dayOfYearToMonthIndex(dayOfYear);
  const weekNum  = Math.floor(dayOfYear / 7) + 1;
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
          <p className="text-[10px] text-blue-400/50 font-mono">{virtualDate}</p>
        </div>
      </div>

      {/* Ecliptic longitude — live */}
      <div className="flex items-center justify-between gap-4 py-1 border-b border-white/5">
        <span className="text-xs text-white/40">Долгота</span>
        <span className="text-sm font-bold text-blue-400">{Math.round(lon)}°</span>
      </div>

      {/* Season */}
      <div className="flex items-center justify-between gap-4 py-1 border-b border-white/5">
        <span className="text-xs text-white/40">Сезон</span>
        <span className={`text-sm font-bold ${season.color}`}>{season.name}</span>
      </div>

      {/* Month + week */}
      <div className="flex items-center justify-between gap-4 py-1 border-b border-white/5">
        <span className="text-xs text-white/40">Месяц</span>
        <span className="text-sm font-bold text-emerald-400">{MONTH_NAMES_RU[monthIdx]}</span>
      </div>
      <div className="flex items-center justify-between gap-4 py-1">
        <span className="text-xs text-white/40">Неделя года</span>
        <span className="text-sm font-bold text-emerald-400">{weekNum}</span>
      </div>
    </div>
  );
}

// ─── Dashboard phase type ─────────────────────────────────────────────────────
type DashboardPhase = "idle" | "loading" | "ready" | "playing";

// ─── Probe trail helper ──────────────────────────────────────────────────────
// Body ID → display name mapping for all probes
const PROBE_ID_TO_NAME: Record<string, string> = {
  Pioneer_10:         "Pioneer 10",
  Pioneer_11:         "Pioneer 11",
  Voyager_1:          "Voyager 1",
  Voyager_2:          "Voyager 2",
  Cassini:            "Cassini",
  MESSENGER:          "MESSENGER",
  New_Horizons:       "New Horizons",
  Parker_Solar_Probe: "Parker Solar Probe",
};

// Per-probe trail length (days). Short-period probes near the Sun get fewer points
// to avoid multi-loop spirals. Defaults to 365 for all others.
const PROBE_TRAIL_DAYS: Record<string, number> = {
  "MESSENGER":          180,  // Mercury orbit ~88 days — 365 pts ≈ 4 loops
  "Parker Solar Probe": 180,  // perihelion ~88-150 days — 365 pts ≈ 2-4 loops
};
const DEFAULT_TRAIL_DAYS = 365;

// Returns trail points from each probe's dataset up to currentDate.
// Excludes pre-launch sentinel points (distance < 0).
function buildProbeTrails(
  dataset:     SpaceDataset | null,
  currentDate: string,
): Map<string, SpacePoint[]> {
  const result = new Map<string, SpacePoint[]>();
  if (!dataset) return result;
  for (const body of dataset.bodies) {
    const name = PROBE_ID_TO_NAME[body.body];
    if (!name) continue;
    const idx = body.points.findLastIndex((p) => p.date <= currentDate && p.distance >= 0);
    if (idx < 0) continue;
    const maxPts = PROBE_TRAIL_DAYS[name] ?? DEFAULT_TRAIL_DAYS;
    // Find the first valid (non-sentinel) point within the trail window
    const windowStart = Math.max(0, idx - maxPts + 1);
    const slice = body.points.slice(windowStart, idx + 1).filter((p) => p.distance >= 0);
    if (slice.length >= 2) result.set(name, slice);
  }
  return result;
}

// ─── Component ────────────────────────────────────────────────────────────────
export default function SpaceDashboard({ isElite = false }: { isElite?: boolean }) {
  // ── Dashboard phase state machine ───────────────────────────────────────────
  // IDLE     → DataLoader form shown
  // LOADING  → DataLoader terminal shown (loading in progress)
  // READY    → DataLoader terminal shown (play button visible)
  // PLAYING  → full animation UI, DataLoader hidden
  const [phase,   setPhase]   = useState<DashboardPhase>("idle");
  const [dataset, setDataset] = useState<SpaceDataset | null>(null);
  const [loaderKey, setLoaderKey] = useState(0);

  const handleDatasetReady = useCallback((data: SpaceDataset) => {
    setDataset(data);
    setPhase("playing");
    setLoaderKey((k) => k + 1);   // reset DataLoader back to idle
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
    () => buildProbeTrails(dataset, anim.currentDate),
    [dataset, anim.currentDate],
  );

  // ── Mock-mode state (when not playing real data) ─────────────────────────────
  const [mode, setMode]                   = useState<MapMode>(isElite ? "animate" : "static");
  const [selectedDate, setSelectedDate]   = useState<string>(TODAY_ISO);
  const [showDatePicker, setShowDatePicker] = useState(true);
  const [hasPickedDate, setHasPickedDate] = useState(false);
  const [animOriginDate, setAnimOriginDate] = useState<string>(TODAY_ISO);
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
    const originDate = mode === "date" ? displayDate
                     : mode === "animate" ? animOriginDate
                     : TODAY_ISO;
    for (const p of PLANETS) {
      r[p.nameEn] = getPlanetSVGAngle(p.nameEn, originDate);
    }
    return r;
  }, [displayDate, mode, animOriginDate]);

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
    for (const v of PROBES) if (v.angle) r[v.name] = v.angle;
    return r;
  }, []);

  const isPlaying = phase === "playing";

  // ── Map scale (log / linear) ─────────────────────────────────────────────
  const [mapScale, setMapScale] = useState<"log" | "linear">("log");

  // ── Hovered body (for NASA photo card on right) ────────────────────────────
  const [photoBody, setPhotoBody] = useState("Sun");
  const photoTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleHoverBody = useCallback((nameEn: string | null) => {
    if (photoTimerRef.current) { clearTimeout(photoTimerRef.current); photoTimerRef.current = null; }
    if (nameEn) {
      setPhotoBody(nameEn);
    } else {
      // cursor left SVG — reset to Sun after 3s
      photoTimerRef.current = setTimeout(() => setPhotoBody("Sun"), 3000);
    }
  }, []);

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
          </div>
        ) : (
          <div className="relative z-10 flex items-start gap-3 rounded-xl border border-blue-500/30 bg-blue-500/10 px-4 py-3 text-sm text-blue-300">
            <span className="text-base shrink-0 mt-0.5">🪐</span>
            <span>
              <strong>Позиции планет</strong> — кеплеровская формула + поправка JPL Horizons (2026-02-27).
              {isElite && mode !== "animate" && " Переключись на Анимацию для загрузки данных NASA."}
            </span>
          </div>
        )}

        {/* ── Map + right column ──────────────────────────────────────────── */}
        <div className="relative z-10 grid gap-6 lg:grid-cols-3 items-stretch">

          {/* Map — left 2/3 */}
          <div className="lg:col-span-2 space-y-3">
            {/* Mode selector */}
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-sm font-semibold uppercase tracking-widest text-blue-400/70 shrink-0">
                Солнечная система
              </h2>
              <div className="flex items-center gap-2" style={{ minWidth: 340 }}>
                <ModeButton label="Сегодня"  active={mode === "static" && !isPlaying}  onClick={() => { setMode("static"); handleReset(); }}  />
                <div className="relative flex-1 flex">
                  <ModeButton
                    label={hasPickedDate ? formatDateBtn(selectedDate) : "По дате"}
                    active={mode === "date" && !isPlaying}
                    onClick={() => { setMode("date"); setShowDatePicker(true); handleReset(); }}
                  />
                  {mode === "date" && !isPlaying && showDatePicker && (
                    <DatePicker
                      value={selectedDate}
                      onChange={(iso) => { setSelectedDate(iso); setHasPickedDate(true); }}
                      onClose={() => setShowDatePicker(false)}
                    />
                  )}
                </div>
                {isElite ? (
                  <ModeButton label="Анимация" active={mode === "animate"} onClick={() => {
                    const origin = mode === "date" ? selectedDate : TODAY_ISO;
                    setAnimOriginDate(origin);
                    setMode("animate");
                  }} />
                ) : (
                  <button
                    disabled
                    title="Доступно с Elite подпиской"
                    className="flex-1 px-2 py-1 rounded-md text-xs font-medium text-white/20 border border-transparent cursor-not-allowed text-center whitespace-nowrap"
                  >
                    Анимация 🔒
                  </button>
                )}
              </div>
            </div>

            <div className="rounded-xl overflow-hidden bg-black/40 border border-white/5">
              <SolarSystemMap
                mode={isPlaying ? "static" : mode}
                planetAngles={baseAngles}
                liveAngles={liveAngles}
                voyagerAngles={voyagerAngles}
                currentPositions={isPlaying ? anim.currentPositions : null}
                voyagerTrails={isPlaying ? voyagerTrails : null}
                onHoverBody={handleHoverBody}
                onScaleChange={setMapScale}
              />
            </div>

            <p className="text-xs text-white/30 text-center">
              Орбиты {mapScale === "linear" ? "в линейном" : "в логарифмическом"} масштабе · Наведите на планету или орбиту для деталей
            </p>
          </div>

          {/* Right 1/3 */}
          <div className="lg:col-span-1 flex flex-col gap-4">
            {/* NASA photo card — always visible, changes on hover */}
            {(() => {
              const img    = NASA_IMAGES[photoBody];
              if (!img) return null;
              const planet = PLANETS.find((p) => p.nameEn === photoBody);
              const probe  = PROBES.find((v) => v.name === photoBody);
              const nameRu = planet?.name ?? (photoBody === "Sun" ? "Солнце" : photoBody);
              const border = probe ? "border-red-500/30" : photoBody === "Sun" ? "border-amber-500/20" : "border-white/15";
              return (
                <div className={`rounded-xl border ${border} bg-black/50 overflow-hidden`}>
                  <div className="relative w-full" style={{ aspectRatio: "16/9" }}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      key={photoBody}
                      src={img.url}
                      alt={photoBody}
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent px-3 py-2">
                      <p className="text-sm font-semibold text-white">{nameRu}</p>
                      <p className="text-[10px] text-white/40">{img.credit}</p>
                    </div>
                  </div>
                </div>
              );
            })()}

            <EarthInfoBlock
              liveSVGAngle={earthSVGAngle}
              displayDate={isPlaying ? (anim.currentDate || displayDate) : displayDate}
              mode={isPlaying ? "animate" : mode}
              animOriginDate={animOriginDate}
              animElapsedMs={animElapsedMs}
            />

            {/* DataLoader (before playing) or player (after playing) — Elite only */}
            {isElite && mode === "animate" && !isPlaying && (
              <div className="rounded-xl border border-white/10 bg-white/5 p-4">
                <DataLoader
                  key={loaderKey}
                  onComplete={handleDatasetReady}
                />
              </div>
            )}
            {isPlaying && (
              <>
                <AnimationControls anim={anim} startDate={dataset?.startDate} endDate={dataset?.endDate} compact />
                <button
                  onClick={handleReset}
                  className="w-full px-3 py-1.5 rounded-lg border border-white/20 text-xs text-white/50 hover:text-white/80 transition-colors"
                >
                  ← Новый диапазон
                </button>
              </>
            )}

          </div>
        </div>

        {/* ── Voyager probes — full width ─────────────────────────────────── */}
        <div className="relative z-10">
          <VoyagerTracker />
        </div>
      </div>
    </>
  );
}
