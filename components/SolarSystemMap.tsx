"use client";

import { useState, useRef, useEffect } from "react";
import { PLANETS, PROBES } from "@/lib/mockData";
import { getPlanetSVGAngle } from "@/lib/planetPositions";
import type { Planet, Voyager, SpacePoint } from "@/types/space";

// ─── SVG constants ────────────────────────────────────────────────────────────
const CX = 400;
const CY = 400;
const SVG_SIZE = 800;
const SVG_H    = 920;   // taller than wide so Voyagers fit below the orbital plane
const MIN_R = 30;
const MAX_R = 320;

// Log scale spans from Mercury's orbit (0.39 AU) to Neptune (30.1 AU) → [MIN_R, MAX_R].
// Planet orbit rings are anchored here — do not change LOG_MIN or ring positions shift.
const LOG_MIN = Math.log10(0.39);
const LOG_MAX = Math.log10(30.1);

function orbitRadius(distance: number): number {
  const logD = Math.max(LOG_MIN, Math.min(LOG_MAX, Math.log10(distance)));
  return MIN_R + ((logD - LOG_MIN) / (LOG_MAX - LOG_MIN)) * (MAX_R - MIN_R);
}

export const ANIM_DURATIONS: Record<string, number> = {
  Mercury: 7,
  Venus:   18,
  Earth:   28,
  Mars:    52,
  Jupiter: 110,
  Saturn:  260,
  Uranus:  580,
  Neptune: 1150,
};

const VOYAGER_R = 355;
const MIN_ORBIT_PX = 4;

// Inner zone for probes inside Mercury's orbit (e.g. Parker Solar Probe).
// Cubic Hermite spline [0.04, 0.39 AU] → [INNER_R_MIN, MIN_R]:
//   • slope = 0 at d=0.04 (horizontal at PSP perihelion)
//   • slope = log-scale derivative at d=0.39 (C¹ continuous — no kink)
const INNER_D_MIN = 0.04;    // PSP perihelion ≈ 0.046 AU
const INNER_D_MAX = 0.39;    // Mercury's orbit (= LOG_MIN base)
const INNER_R_MIN = 8;       // visual radius at INNER_D_MIN

// Log-scale derivative dr/dd at Mercury's orbit (px/AU), converted to t-space by × Δd.
// dr/dd = (MAX_R − MIN_R) / ((LOG_MAX − LOG_MIN) · ln10 · d)
const _INNER_DELTA = INNER_D_MAX - INNER_D_MIN;                // 0.35 AU
const _LOG_SLOPE_AT_MERCURY =
  (MAX_R - MIN_R) / ((LOG_MAX - LOG_MIN) * Math.LN10 * INNER_D_MAX);
const HERMITE_M1 = _LOG_SLOPE_AT_MERCURY * _INNER_DELTA;       // slope in t-space at t=1

// Smooth log extension beyond Neptune: [30.07, 170 AU] → [MAX_R, VOYAGER_R].
const LOG_PROBE_EXT_MIN = Math.log10(30.07);
const LOG_PROBE_EXT_MAX = Math.log10(170);

function probeRadius(distance: number): number {
  if (distance <= INNER_D_MIN) return INNER_R_MIN;
  if (distance < INNER_D_MAX) {
    // Cubic Hermite: P(t) = h00·P0 + h10·m0 + h01·P1 + h11·m1
    // m0=0 (flat start), m1=HERMITE_M1 (matches log slope at Mercury)
    const t  = (distance - INNER_D_MIN) / _INNER_DELTA;
    const t2 = t * t;
    const t3 = t2 * t;
    const h01 = -2*t3 + 3*t2;          // weight of P1 = MIN_R
    const h11 =    t3 -   t2;          // weight of m1
    return (1 - h01) * INNER_R_MIN + h01 * MIN_R + h11 * HERMITE_M1;
  }
  if (distance <= 30.07) return orbitRadius(distance);
  // Outer extension beyond Neptune
  const frac = Math.min(
    1,
    (Math.log10(distance) - LOG_PROBE_EXT_MIN) / (LOG_PROBE_EXT_MAX - LOG_PROBE_EXT_MIN),
  );
  return MAX_R + (VOYAGER_R - MAX_R) * frac;
}

// Heliosphere boundary zones — shown only in linear mode
const HELIOSPHERE_ZONES = [
  { au: 85,  label: "Терм. удар",  stroke: "rgba(251,191,36,0.22)",  textFill: "rgba(251,191,36,0.60)"  },
  { au: 120, label: "Гелиопауза",  stroke: "rgba(147,197,253,0.28)", textFill: "rgba(147,197,253,0.65)" },
];

// Linear scale options — selected one sets effectiveMaxAU
const SCALE_OPTIONS = [
  { key: "voyagers",   label: "Все зонды", au: 170   },
  { key: "heliopause", label: "Гелиопауза",    au: 120   },
  { key: "termshock",  label: "Терм. удар",    au: 85    },
  { key: "neptune",    label: "Нептун",        au: 30.07 },
  { key: "uranus",     label: "Уран",          au: 19.19 },
  { key: "saturn",     label: "Сатурн",        au: 9.537 },
  { key: "jupiter",    label: "Юпитер",        au: 5.203 },
  { key: "mars",       label: "Марс",          au: 1.524 },
] as const;
type ScaleKey = typeof SCALE_OPTIONS[number]["key"];

// ─── Elliptical orbit helpers (used in Linear mode) ─────────────────────────
/** Heliocentric distance (AU) at a given ecliptic longitude, accounting for eccentricity. */
function planetDistAU(p: Planet, eclLonDeg: number): number {
  const e = p.eccentricity;
  if (e === 0) return p.distance;
  const nu = ((eclLonDeg - p.perihelionLon) * Math.PI) / 180;
  return p.distance * (1 - e * e) / (1 + e * Math.cos(nu));
}

// ─── CSS-animation elliptical keyframes (Linear mode) ────────────────────────
const ELLIPSE_N = 72;                        // sample every 5°
const ELLIPSE_KT = Array.from({ length: ELLIPSE_N + 1 }, (_, i) =>
  (i / ELLIPSE_N).toFixed(6),
).join(";");

/**
 * Build `<animateTransform type="translate">` values string for one orbit.
 * At each keyframe the radial offset Δx = r(angle_i) − r(angle_0) keeps the
 * planet on its Keplerian ellipse while <animateTransform type="rotate"> on the
 * parent <g> handles the angular position.
 */
function ellipseTranslateVals(
  planet: Planet, startAngle: number, baseR: number, pxPerAU: number,
): string {
  const eclStart = (((-startAngle) % 360) + 360) % 360;
  const vals: string[] = [];
  for (let i = 0; i <= ELLIPSE_N; i++) {
    const eclLon = (eclStart + (i / ELLIPSE_N) * 360) % 360;
    const dx = planetDistAU(planet, eclLon) * pxPerAU - baseR;
    vals.push(`${dx.toFixed(1)} 0`);
  }
  return vals.join(";");
}

// ─── Deterministic stars — all minimum size (r=0.5, sub-pixel) ───────────────
const STAR_DATA = Array.from({ length: 200 }, (_, i) => {
  const px = (Math.sin(i * 127.1 + 311.7) * 0.5 + 0.5) * (SVG_SIZE - 2);
  const py = (Math.sin(i * 311.7 + 127.1) * 0.5 + 0.5) * (SVG_H - 2);
  const op = Number((0.10 + (i % 5) * 0.04).toFixed(2)); // 0.10–0.26
  return { px: +px.toFixed(1), py: +py.toFixed(1), op };
});

// ─── Russian plural for years ─────────────────────────────────────────────────
function yearsLabel(n: number): string {
  if (n % 1 !== 0) return "лет";
  const f = Math.floor(n), m10 = f % 10, m100 = f % 100;
  if (m100 >= 11 && m100 <= 14) return "лет";
  if (m10 === 1) return "год";
  if (m10 >= 2 && m10 <= 4) return "года";
  return "лет";
}

// ─── Reference-line helpers ───────────────────────────────────────────────────
function refEnd(svgAngleDeg: number, radius = 388) {
  const rad = (svgAngleDeg * Math.PI) / 180;
  return { x: CX + radius * Math.cos(rad), y: CY + radius * Math.sin(rad) };
}

function refAnchor(svgAngleDeg: number): "start" | "middle" | "end" {
  const a = ((svgAngleDeg % 360) + 360) % 360;
  if (a > 20  && a < 160) return "start";
  if (a > 200 && a < 340) return "end";
  return "middle";
}

function refDy(svgAngleDeg: number): number {
  const a = ((svgAngleDeg % 360) + 360) % 360;
  if (a > 45 && a < 135)  return 12;
  if (a > 225 && a < 315) return -4;
  return 4;
}

// ─── Season reference angles ──────────────────────────────────────────────────
const CY_STR = new Date().getFullYear().toString();
const SA_MAR1 = getPlanetSVGAngle("Earth", `${CY_STR}-03-01`);
const SA_JUN1 = getPlanetSVGAngle("Earth", `${CY_STR}-06-01`);
const SA_SEP1 = getPlanetSVGAngle("Earth", `${CY_STR}-09-01`);
const SA_DEC1 = getPlanetSVGAngle("Earth", `${CY_STR}-12-01`);
const SA_NY   = getPlanetSVGAngle("Earth", `${CY_STR}-01-01`);

const SEASON_LINE_STROKE = "rgba(253,224,71,0.35)";

// 4° offset — labels hug their boundary lines; dx/dy for per-label fine-tuning
const SEASON_DATA = [
  { id: "spring", lineAngle: SA_MAR1, label: "Весна", labelAngle: ((SA_MAR1 - 4) + 360) % 360, stroke: SEASON_LINE_STROKE, labelColor: "rgba(134,239,172,0.75)", dx:  0, dy:  0 },
  { id: "summer", lineAngle: SA_JUN1, label: "Лето",  labelAngle: ((SA_JUN1 - 4) + 360) % 360, stroke: SEASON_LINE_STROKE, labelColor: "rgba(253,224,71,0.75)",  dx: -8, dy: 10 },
  { id: "autumn", lineAngle: SA_SEP1, label: "Осень", labelAngle: ((SA_SEP1 - 4) + 360) % 360, stroke: SEASON_LINE_STROKE, labelColor: "rgba(251,146,60,0.75)",  dx:  0, dy:  0 },
  { id: "winter", lineAngle: SA_DEC1, label: "Зима",  labelAngle: ((SA_DEC1 - 4) + 360) % 360, stroke: SEASON_LINE_STROKE, labelColor: "rgba(147,197,253,0.75)", dx: 12, dy: -10 },
];

// ─── Types ────────────────────────────────────────────────────────────────────
export type MapMode = "static" | "animate" | "date";

export interface SolarSystemMapProps {
  mode:              MapMode;
  planetAngles:      Record<string, number>;
  liveAngles:        Record<string, number>;
  voyagerAngles:     Record<string, number>;
  currentPositions?: Map<string, SpacePoint> | null;
  voyagerTrails?:    Map<string, SpacePoint[]> | null;
  onHoverBody?:      (nameEn: string | null) => void;
  onScaleChange?:    (scale: "log" | "linear") => void;
}

type TooltipState =
  | { kind: "planet";  data: Planet;  x: number; y: number }
  | { kind: "voyager"; data: Voyager; x: number; y: number }
  | null;

// ─── Component ────────────────────────────────────────────────────────────────
export function SolarSystemMap({
  mode, planetAngles, liveAngles, voyagerAngles,
  currentPositions = null, voyagerTrails = null, onHoverBody, onScaleChange,
}: SolarSystemMapProps) {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const clearRef   = useRef<ReturnType<typeof setTimeout> | null>(null);
  const svgRef     = useRef<SVGSVGElement>(null);

  useEffect(() => {
    if (mode === "animate") svgRef.current?.setCurrentTime(0);
  }, [mode]);

  const [tooltip,       setTooltip]       = useState<TooltipState>(null);
  const [hoveredPlanet, setHoveredPlanet] = useState<string | null>(null);

  // ── Probe toggles (chronological by launch) ─────────────────────────────
  const [showPioneer,  setShowPioneer]  = useState(false);
  const [showVoyagers, setShowVoyagers] = useState(true);
  const [showCassini,  setShowCassini]  = useState(false);
  const [showMsgr,     setShowMsgr]     = useState(false);
  const [showNH,       setShowNH]       = useState(false);
  const [showPSP,      setShowPSP]      = useState(false);

  // ── Cosmetic layer toggles (log + linear) ────────────────────────────────
  const [showSeasons,  setShowSeasons]  = useState(false);
  const [showNY,       setShowNY]       = useState(false);
  const [showVernal,   setShowVernal]   = useState(true);

  // ── Scale + size toggles ─────────────────────────────────────────────────
  const [scale,    setScale]    = useState<"log" | "linear">("log");
  const [sizeMode, setSizeMode] = useState<1 | 5 | 15>(5);

  // ── Linear scale selector ─────────────────────────────────────────────────
  const [scaleKey, setScaleKey] = useState<ScaleKey>("neptune");

  const effectiveMaxAU = scale === "linear"
    ? (SCALE_OPTIONS.find((o) => o.key === scaleKey)?.au ?? 120)
    : 30.07; // irrelevant for log mode

  const linPxPerAU = VOYAGER_R / effectiveMaxAU;

  // Heliosphere zone rings — shown when scale includes them
  const linShowHeliopause = effectiveMaxAU >= 120;
  const linShowTermShock  = effectiveMaxAU >= 85;

  /** Scale-aware orbit radius (px from centre). */
  function scaledR(distAU: number): number {
    return scale === "linear" ? distAU * linPxPerAU : orbitRadius(distAU);
  }

  /** Effective planet dot radius for the current size mode (log scale). */
  function eSize(planet: Planet): number {
    if (sizeMode === 1) {
      // Mirror Linear ×5 exactly: Jupiter=3, Saturn=2 (+ line), Uranus/Neptune=2.
      // Earth slightly fatter than the rest for readability.
      if (planet.nameEn === "Jupiter")                               return 3;
      if (planet.nameEn === "Saturn")                                return 2;
      if (planet.nameEn === "Uranus" || planet.nameEn === "Neptune") return 2;
      if (planet.nameEn === "Earth")                                 return 2.5;
      if (planet.nameEn === "Venus"  || planet.nameEn === "Mars")    return 2;
      return 1.5; // Mercury
    }
    if (sizeMode === 15) {
      if (planet.nameEn === "Jupiter")                               return 16;
      if (planet.nameEn === "Saturn")                                return 12;
      if (planet.nameEn === "Uranus" || planet.nameEn === "Neptune") return 8;
      if (planet.nameEn === "Earth")                                 return 7;
      if (planet.nameEn === "Venus")                                 return 6;
      if (planet.nameEn === "Mars")                                  return 5.5;
      return 5; // Mercury
    }
    return planet.size; // ×5
  }

  function getPos(e: React.MouseEvent) {
    if (!wrapperRef.current) return { x: 0, y: 0 };
    const rect = wrapperRef.current.getBoundingClientRect();
    return { x: e.clientX - rect.left + 14, y: e.clientY - rect.top - 12 };
  }

  function cancelClose() {
    if (clearRef.current) clearTimeout(clearRef.current);
  }

  function scheduleClose() {
    clearRef.current = setTimeout(() => {
      setHoveredPlanet(null);
      setTooltip(null);
      // NOTE: don't call onHoverBody(null) here — photo card keeps last body
    }, 60);
  }

  function openPlanetTooltip(e: React.MouseEvent, planet: Planet) {
    cancelClose();
    const { x, y } = getPos(e);
    setHoveredPlanet(planet.nameEn);
    setTooltip({ kind: "planet", data: planet, x, y });
    onHoverBody?.(planet.nameEn);
  }

  function openVoyagerTooltip(e: React.MouseEvent, voyager: Voyager) {
    cancelClose();
    const { x, y } = getPos(e);
    setHoveredPlanet(null);
    setTooltip({ kind: "voyager", data: voyager, x, y });
    onHoverBody?.(voyager.name);
  }

  function handleSVGMouseMove(e: React.MouseEvent<SVGSVGElement>) {
    if (!wrapperRef.current) return;
    const rect = wrapperRef.current.getBoundingClientRect();
    setTooltip(prev =>
      prev ? { ...prev, x: e.clientX - rect.left + 14, y: e.clientY - rect.top - 12 } : null
    );
  }

  function handleSVGLeave() {
    cancelClose();
    setHoveredPlanet(null);
    setTooltip(null);
    onHoverBody?.(null);
  }

  const isAnimating = mode === "animate" && !currentPositions;

  // ── Position resolver helpers ──────────────────────────────────────────────
  function resolvePlanetAngle(nameEn: string): number {
    if (currentPositions) {
      const pt = currentPositions.get(nameEn);
      if (pt) return (((-pt.angle) % 360) + 360) % 360;
    }
    return planetAngles[nameEn] ?? 0;
  }

  function resolveTooltipAngle(nameEn: string): number {
    if (currentPositions) {
      const pt = currentPositions.get(nameEn);
      if (pt) return (((-pt.angle) % 360) + 360) % 360;
    }
    return liveAngles[nameEn] ?? planetAngles[nameEn] ?? 0;
  }

  function resolveVoyagerPos(voyager: Voyager) {
    if (currentPositions) {
      const pt = currentPositions.get(voyager.name);
      if (pt) {
        const rad = (pt.angle * Math.PI) / 180;
        const r = scale === "log" ? probeRadius(pt.distance) : scaledR(pt.distance);
        return { vx: CX + r * Math.cos(rad), vy: CY - r * Math.sin(rad), distance: pt.distance };
      }
    }
    const angle = voyagerAngles[voyager.name] ?? voyager.angle;
    const rad   = (angle * Math.PI) / 180;
    const vr = scale === "linear" ? voyager.distance * linPxPerAU : probeRadius(voyager.distance);
    return { vx: CX + vr * Math.cos(rad), vy: CY - vr * Math.sin(rad), distance: voyager.distance };
  }

  // Returns trail as an array of polyline point-strings, one per continuous segment.
  // In log mode, points below 0.39 AU (log-scale floor) are skipped — clamping them
  // all to MIN_R at different angles produces a dense cluster of dashes at the inner
  // ring (visible for PSP with perihelion ~0.046 AU). Skipping breaks the trail into
  // clean aphelion arcs with natural gaps at each perihelion pass.
  function buildTrailSegments(voyagerName: string): string[] {
    const trail = voyagerTrails?.get(voyagerName);
    if (!trail || trail.length < 2) return [];

    const segments: string[] = [];
    let current: string[] = [];

    for (const pt of trail) {
      // Skip only at the absolute scale floor (LOG_MIN = 0.04 AU).
      // orbitRadius() clamps distances below 0.04 AU to MIN_R, creating a ring
      // of identical-radius points at different angles — skip them instead.
      const skip = scale === "log" && pt.distance < 0.04;
      if (!skip) {
        const rad = (pt.angle * Math.PI) / 180;
        const r = scale === "log" ? probeRadius(pt.distance) : scaledR(pt.distance);
        current.push(`${(CX + r * Math.cos(rad)).toFixed(1)},${(CY - r * Math.sin(rad)).toFixed(1)}`);
      } else {
        if (current.length >= 2) segments.push(current.join(" "));
        current = [];
      }
    }
    if (current.length >= 2) segments.push(current.join(" "));

    return segments;
  }

  // ── Probe visibility & colors ─────────────────────────────────────────────
  const probeVisible: Record<string, boolean> = {
    "Pioneer 10":         showPioneer,
    "Pioneer 11":         showPioneer,
    "Voyager 1":          showVoyagers,
    "Voyager 2":          showVoyagers,
    "Cassini":            showCassini,
    "MESSENGER":          showMsgr,
    "New Horizons":       showNH,
    "Parker Solar Probe": showPSP,
  };
  const PROBE_COLOR: Record<string, string> = {
    "Pioneer 10":         "#FFB347",
    "Pioneer 11":         "#FFB347",
    "Voyager 1":          "#FF6B6B",
    "Voyager 2":          "#FF6B6B",
    "Cassini":            "#9B7DFF",
    "MESSENGER":          "#00CED1",
    "New Horizons":       "#7BE87B",
    "Parker Solar Probe": "#FFD700",
  };
  // Missions no longer active (crashed / contact lost)
  const COMPLETED_MISSIONS = new Set(["Pioneer 10", "Pioneer 11", "Cassini", "MESSENGER"]);
  // Last real data point date for completed missions (dateRange excludes upper bound,
  // so this is one day before PROBE_LATEST). Cross shown from this date onwards.
  const MISSION_END_DATES: Record<string, string> = {
    "Pioneer 10": "2003-01-22",
    "Pioneer 11": "1995-11-29",
    "Cassini":    "2017-09-14",
    "MESSENGER":  "2015-04-30",
  };

  // Per-probe label placement — spread overlapping labels apart
  // Pioneer 11 (284.6°), New Horizons (288.4°), Voyager 2 (290.7°) cluster within 6°
  const PROBE_LABEL_POS: Record<string, { dx: number; dy: number; anchor: "start" | "middle" | "end" }> = {
    "Pioneer 10":   { dx: -10, dy:   4, anchor: "end"    },  // left of dot
    "Voyager 1":    { dx:  10, dy:  -4, anchor: "start"  },  // right of dot, higher
    "Voyager 2":    { dx:  14, dy:  -2, anchor: "start"  },  // right, slightly above
    "New Horizons": { dx:  -6, dy:  18, anchor: "start"  },  // below-left
    "Pioneer 11":   { dx: -10, dy:  -2, anchor: "end"    },  // left of dot, aligned with V1
    "Cassini":      { dx:  10, dy:  10, anchor: "start"  },  // right of dot, lower
    "MESSENGER":    { dx:   0, dy: -10, anchor: "middle" },  // above, centered
  };

  return (
    <div ref={wrapperRef} className="relative w-full" style={{ aspectRatio: `${SVG_SIZE} / ${SVG_H}` }}>
      <svg
        ref={svgRef}
        viewBox={`0 0 ${SVG_SIZE} ${SVG_H}`}
        width="100%"
        height="100%"
        onMouseMove={handleSVGMouseMove}
        onMouseLeave={handleSVGLeave}
      >
        {/* ── Vernal equinox line ♈ 0° ─────────────────────────────────── */}
        {showVernal && (
          <>
            <line
              x1={CX} y1={CY} x2={SVG_SIZE} y2={CY}
              stroke="rgba(75,156,211,0.30)" strokeWidth="1" strokeDasharray="5 4"
            />
            <text
              x={SVG_SIZE - 4} y={CY - 5}
              fill="rgba(75,156,211,0.45)" fontSize="11" fontFamily="monospace" textAnchor="end"
            >
              ♈ 0°
            </text>
          </>
        )}

        {/* ── Season sector lines + labels ─────────────────────────────── */}
        {showSeasons && (
          <>
            {SEASON_DATA.map(({ id, lineAngle, stroke }) => {
              const end = refEnd(lineAngle, 385);
              return (
                <line key={id}
                  x1={CX} y1={CY} x2={end.x} y2={end.y}
                  stroke={stroke} strokeWidth="1" strokeDasharray="5 4"
                />
              );
            })}
            {SEASON_DATA.map(({ label, labelAngle, labelColor, dx, dy }) => {
              const p = refEnd(labelAngle, 375);
              return (
                <text key={label}
                  x={p.x + dx} y={p.y + dy}
                  fill={labelColor} fontSize="10" fontFamily="monospace"
                  textAnchor={refAnchor(labelAngle)} dominantBaseline="middle"
                >
                  {label}
                </text>
              );
            })}
          </>
        )}

        {/* ── New Year line ─────────────────────────────────────────────── */}
        {showNY && (() => {
          const end = refEnd(SA_NY, 385);
          const lp  = refEnd(SA_NY, 372);
          return (
            <>
              <line
                x1={CX} y1={CY} x2={end.x} y2={end.y}
                stroke="rgba(196,181,253,0.40)" strokeWidth="1" strokeDasharray="3 4"
              />
              <text
                x={lp.x} y={lp.y} dy={refDy(SA_NY)}
                fill="rgba(196,181,253,0.70)" fontSize="11" fontFamily="monospace"
                textAnchor={refAnchor(SA_NY)}
              >
                НГ
              </text>
            </>
          );
        })()}

        {/* ── Stars — all r=0.5 (sub-pixel minimum), no star larger than a pixel ── */}
        {STAR_DATA.map((s, i) => (
          <circle key={i} cx={s.px} cy={s.py} r={0.5} fill="white" opacity={s.op} />
        ))}

        {/* ── Heliosphere zones (linear mode, shown when scale includes them) ── */}
        {scale === "linear" && HELIOSPHERE_ZONES.map(({ au, label, stroke, textFill }) => {
          const show = au === 85 ? linShowTermShock : linShowHeliopause;
          if (!show) return null;
          const r  = au * linPxPerAU;
          const lx = +(CX + (r + 16) * 0.7071).toFixed(1);
          const ly = +(CY + (r + 16) * 0.7071).toFixed(1);
          return (
            <g key={label}>
              <circle cx={CX} cy={CY} r={r}
                fill="none" stroke={stroke} strokeWidth="1" strokeDasharray="6 5"
              />
              <text x={lx} y={ly}
                fill={textFill} fontSize="10" fontFamily="monospace"
                textAnchor="middle" dominantBaseline="middle"
                transform={`rotate(-45, ${lx}, ${ly})`}
              >
                {label} ({au} AU)
              </text>
            </g>
          );
        })}

        {/* ── Orbit rings — visual ─────────────────────────────────────── */}
        {PLANETS.map((planet) => {
          const r         = scaledR(planet.distance);
          const isHovered = hoveredPlanet === planet.nameEn;
          if (scale === "linear" && r < MIN_ORBIT_PX) return null;
          const stroke      = isHovered ? planet.color : "rgba(255,255,255,0.15)";
          const strokeWidth = isHovered ? 2 : 1;
          const strokeOp    = isHovered ? 0.7 : 1;

          // Linear mode: elliptical orbits (always — in all sub-modes)
          if (scale === "linear" && planet.eccentricity > 0) {
            const a  = planet.distance;
            const e  = planet.eccentricity;
            const aPx = a * linPxPerAU;
            const bPx = a * Math.sqrt(1 - e * e) * linPxPerAU;
            const cPx = a * e * linPxPerAU;
            return (
              <ellipse
                key={`orbit-vis-${planet.nameEn}`}
                cx={CX - cPx} cy={CY}
                rx={aPx} ry={bPx}
                fill="none" stroke={stroke} strokeWidth={strokeWidth} strokeOpacity={strokeOp}
                transform={`rotate(${-planet.perihelionLon}, ${CX}, ${CY})`}
              />
            );
          }
          return (
            <circle
              key={`orbit-vis-${planet.nameEn}`}
              cx={CX} cy={CY} r={r}
              fill="none" stroke={stroke} strokeWidth={strokeWidth} strokeOpacity={strokeOp}
            />
          );
        })}

        {/* ── Orbit rings — hit areas ───────────────────────────────────── */}
        {PLANETS.map((planet) => {
          const r = scaledR(planet.distance);
          if (scale === "linear" && r < MIN_ORBIT_PX) return null;
          const hitProps = {
            fill: "none" as const,
            stroke: "rgba(255,255,255,0.001)",
            strokeWidth: 16,
            style: { cursor: "pointer" as const, pointerEvents: "stroke" as const },
            onMouseEnter: (e: React.MouseEvent) => openPlanetTooltip(e as React.MouseEvent<Element>, planet),
            onMouseLeave: scheduleClose,
          };
          if (scale === "linear" && planet.eccentricity > 0) {
            const a  = planet.distance;
            const e  = planet.eccentricity;
            const aPx = a * linPxPerAU;
            const bPx = a * Math.sqrt(1 - e * e) * linPxPerAU;
            const cPx = a * e * linPxPerAU;
            return (
              <ellipse
                key={`orbit-hit-${planet.nameEn}`}
                cx={CX - cPx} cy={CY} rx={aPx} ry={bPx}
                transform={`rotate(${-planet.perihelionLon}, ${CX}, ${CY})`}
                {...hitProps}
              />
            );
          }
          return (
            <circle
              key={`orbit-hit-${planet.nameEn}`}
              cx={CX} cy={CY} r={r}
              {...hitProps}
            />
          );
        })}

        {/* ── Sun ──────────────────────────────────────────────────────── */}
        <g style={{ cursor: "pointer" }}
          onMouseEnter={() => { cancelClose(); onHoverBody?.("Sun"); }}
          onMouseLeave={scheduleClose}
        >
        {scale === "log" ? (
          sizeMode === 15 ? (
            <>
              <circle cx={CX} cy={CY} r={46} fill="rgba(253,184,19,0.03)" />
              <circle cx={CX} cy={CY} r={30} fill="rgba(253,184,19,0.07)" />
              <circle cx={CX} cy={CY} r={19} fill="rgba(253,184,19,0.17)" />
              <circle cx={CX} cy={CY} r={12} fill="#FDB813" />
            </>
          ) : sizeMode === 5 ? (
            <>
              <circle cx={CX} cy={CY} r={16} fill="rgba(253,184,19,0.06)" />
              <circle cx={CX} cy={CY} r={11} fill="rgba(253,184,19,0.14)" />
              <circle cx={CX} cy={CY} r={7}  fill="#FDB813" />
            </>
          ) : (
            <circle cx={CX} cy={CY} r={5} fill="#FDB813" />
          )
        ) : (scaleKey === "jupiter" || scaleKey === "mars") ? (
          sizeMode === 15 ? (
            <>
              <circle cx={CX} cy={CY} r={46} fill="rgba(253,184,19,0.03)" />
              <circle cx={CX} cy={CY} r={30} fill="rgba(253,184,19,0.07)" />
              <circle cx={CX} cy={CY} r={19} fill="rgba(253,184,19,0.17)" />
              <circle cx={CX} cy={CY} r={12} fill="#FDB813" />
            </>
          ) : sizeMode === 5 ? (
            <>
              <circle cx={CX} cy={CY} r={16} fill="rgba(253,184,19,0.06)" />
              <circle cx={CX} cy={CY} r={11} fill="rgba(253,184,19,0.14)" />
              <circle cx={CX} cy={CY} r={7}  fill="#FDB813" />
            </>
          ) : (
            <circle cx={CX} cy={CY} r={5} fill="#FDB813" />
          )
        ) : (
          <circle cx={CX} cy={CY} r={sizeMode === 1 ? 1.5 : sizeMode === 5 ? 2 : 3.5} fill="#FDB813" />
        )}
        </g>

        {/* ── Planets ──────────────────────────────────────────────────── */}
        {PLANETS.map((planet) => {
          let r        = scaledR(planet.distance);
          const dur    = ANIM_DURATIONS[planet.nameEn] ?? 60;
          const angle  = resolvePlanetAngle(planet.nameEn);
          const hidden = scale === "linear" && r < MIN_ORBIT_PX;
          const es     = eSize(planet);

          // Linear mode: use actual elliptical distance for all planets
          if (scale === "linear" && planet.eccentricity > 0) {
            const eclLon = (((-angle) % 360) + 360) % 360;
            const realPt = currentPositions?.get(planet.nameEn);
            const distAU = realPt ? realPt.distance : planetDistAU(planet, eclLon);
            r = distAU * linPxPerAU;
          }

          return (
            <g
              key={planet.nameEn}
              transform={!isAnimating ? `rotate(${angle}, ${CX}, ${CY})` : undefined}
              style={hidden ? { visibility: "hidden" } : undefined}
            >
              {isAnimating && (
                <animateTransform
                  attributeName="transform"
                  attributeType="XML"
                  type="rotate"
                  from={`${angle} ${CX} ${CY}`}
                  to={`${angle - 360} ${CX} ${CY}`}
                  dur={`${dur}s`}
                  repeatCount="indefinite"
                />
              )}

              {/* Inner group: radial translate animation keeps planet on Keplerian ellipse
                  during CSS animation in Linear mode */}
              <g>
                {isAnimating && scale === "linear" && planet.eccentricity > 0 && (
                  <animateTransform
                    attributeName="transform"
                    type="translate"
                    values={ellipseTranslateVals(planet, angle, r, linPxPerAU)}
                    keyTimes={ELLIPSE_KT}
                    dur={`${dur}s`}
                    repeatCount="indefinite"
                  />
                )}

                {scale === "log" ? (
                  <>
                    {/* Saturn: ellipse ring when es≥5 (×5 and ×15), line when es<5 (×1) */}
                    {planet.nameEn === "Saturn" && es >= 5 && (
                      <ellipse
                        cx={CX + r} cy={CY}
                        rx={es * 2.2} ry={es * 0.45}
                        fill="none" stroke="#E4D191" strokeWidth="2" strokeOpacity="0.60"
                      />
                    )}
                    <circle cx={CX + r} cy={CY} r={es} fill={planet.color} />
                    {planet.nameEn === "Saturn" && es < 5 && (
                      <line
                        x1={CX + r - 5} y1={CY} x2={CX + r + 5} y2={CY}
                        stroke={planet.color} strokeWidth="1.2" strokeOpacity="0.75"
                      />
                    )}
                    {/* Jupiter bands + red spot — shown whenever es ≥ 5 */}
                    {es >= 5 && planet.nameEn === "Jupiter" && (
                      <>
                        <ellipse
                          cx={CX + r} cy={CY + es * 0.28}
                          rx={es * 0.9} ry={es * 0.28}
                          fill="rgba(100,55,18,0.45)"
                        />
                        <ellipse
                          cx={CX + r + es * 0.28} cy={CY + es * 0.28}
                          rx={es * 0.28} ry={es * 0.2}
                          fill="rgba(190,42,18,0.85)"
                        />
                      </>
                    )}
                    {/* Glow — only for large sizes */}
                    {es >= 8 && (
                      <circle cx={CX + r} cy={CY} r={es + 3} fill={planet.color} opacity="0.15" />
                    )}
                  </>
                ) : (
                  <>
                    <circle
                      cx={CX + r} cy={CY}
                      r={(scaleKey === "jupiter" || scaleKey === "mars")
                        ? es   /* Jupiter/Mars scale: use Log sizes for all ×1/×5/×15 */
                        : sizeMode === 15
                          ? (planet.nameEn === "Jupiter" ? 12 : planet.nameEn === "Saturn" || planet.nameEn === "Uranus" || planet.nameEn === "Neptune" ? 7 : 3.5)
                          : sizeMode === 5
                            ? (planet.nameEn === "Jupiter" ? 6
                                : planet.nameEn === "Saturn" || planet.nameEn === "Uranus" || planet.nameEn === "Neptune" ? 3.5
                                : 2)
                            : (planet.nameEn === "Jupiter" ? 3
                                : planet.nameEn === "Saturn" || planet.nameEn === "Uranus" || planet.nameEn === "Neptune" ? 2
                                : 1)
                      }
                      fill={planet.color}
                    />
                    {/* Saturn: ellipse rings in ×15, line in ×5, tiny line in ×1 */}
                    {planet.nameEn === "Saturn" && sizeMode === 15 && (
                      <ellipse
                        cx={CX + r} cy={CY}
                        rx={18} ry={3.6}
                        fill="none" stroke="#E4D191" strokeWidth="2" strokeOpacity="0.65"
                      />
                    )}
                    {planet.nameEn === "Saturn" && sizeMode === 5 && (
                      <ellipse
                        cx={CX + r} cy={CY}
                        rx={9} ry={1.8}
                        fill="none" stroke="#E4D191" strokeWidth="1.4" strokeOpacity="0.65"
                      />
                    )}
                    {planet.nameEn === "Saturn" && sizeMode === 1 && (
                      <line
                        x1={CX + r - 5} y1={CY} x2={CX + r + 5} y2={CY}
                        stroke={planet.color} strokeWidth="1.2" strokeOpacity="0.75"
                      />
                    )}
                  </>
                )}

                <circle
                  cx={CX + r} cy={CY}
                  r={Math.max(es + 5, 10)}
                  fill="transparent"
                  style={{ cursor: "pointer" }}
                  onMouseEnter={(e) => openPlanetTooltip(e, planet)}
                  onMouseLeave={scheduleClose}
                />
              </g>
            </g>
          );
        })}

        {/* ── Probes (Pioneers, Voyagers, Cassini, MESSENGER, NH, PSP) ── */}
        {PROBES.map((probe) => {
          if (!probeVisible[probe.name]) return null;

          const realPt    = currentPositions?.get(probe.name) ?? null;

          // In animation mode: skip if no data or pre-launch sentinel (distance < 0)
          if (currentPositions && (!realPt || realPt.distance < 0)) return null;

          const { vx, vy } = resolveVoyagerPos(probe);
          const trailSegs = buildTrailSegments(probe.name);
          const color     = PROBE_COLOR[probe.name] ?? "#FF6B6B";
          const vDotR  = sizeMode === 15 ? 6 : sizeMode === 5 ? 3.5 : 2;
          const vGlowR = sizeMode === 15 ? 11 : sizeMode === 5 ? 6   : 4;
          const dist   = (realPt ?? probe).distance;

          // Is mission ended? In animation: show cross from the last real data day onwards.
          // In static mode: completed missions are always ended.
          const endDate  = MISSION_END_DATES[probe.name];
          const isEnded  = currentPositions
            ? (realPt != null && endDate != null && realPt.date >= endDate)
            : COMPLETED_MISSIONS.has(probe.name);

          // Label visibility rules per probe group:
          // - MESSENGER & PSP: inner-system, show only in linear at Jupiter/Mars scale
          // - New Horizons & Cassini: show when beyond Jupiter orbit (5.203 AU)
          // - Others (Voyagers, Pioneers): show when beyond Saturn (log) or Neptune (linear)
          const isInnerProbe = probe.name === "MESSENGER" || probe.name === "Parker Solar Probe";
          const isJupiterProbe = probe.name === "New Horizons" || probe.name === "Cassini";
          const showLabel = isInnerProbe
            ? (scale === "linear" && (scaleKey === "jupiter" || scaleKey === "mars"))
            : isJupiterProbe
              ? dist >= (scale === "linear" && scaleKey === "jupiter" ? 1.524 : 5.203)
              : dist >= (scale === "linear" ? 30.07 : 9.537);

          // Per-probe label offset to avoid overlaps in the crowded bottom area
          // Pioneer 11 (284.6°), New Horizons (288.4°), Voyager 2 (290.7°) are within 6°
          const lbl = PROBE_LABEL_POS[probe.name] ?? { dx: 10, dy: 4, anchor: "start" as const };

          // Cross size for ended missions
          const crossS = sizeMode === 15 ? 5 : sizeMode === 5 ? 3 : 2;

          return (
            <g key={probe.name}>
              {trailSegs.map((pts, si) => (
                <polyline
                  key={si}
                  points={pts}
                  fill="none"
                  stroke={color}
                  strokeWidth="1.5"
                  strokeDasharray="4 3"
                  style={{ opacity: 0.45 }}
                />
              ))}
              {!currentPositions && (
                <line
                  x1={CX} y1={CY} x2={vx} y2={vy}
                  stroke={color} strokeWidth="1" strokeDasharray="5 4"
                  style={{ opacity: 0.3 }}
                />
              )}
              <circle cx={vx} cy={vy} r={vDotR}  fill={color} />
              <circle cx={vx} cy={vy} r={vGlowR} fill={color} style={{ opacity: 0.2 }} />
              {/* Tiny cross on ended missions */}
              {isEnded && (
                <>
                  <line
                    x1={vx - crossS} y1={vy - crossS} x2={vx + crossS} y2={vy + crossS}
                    stroke="white" strokeWidth="1.2" style={{ opacity: 0.7 }}
                  />
                  <line
                    x1={vx + crossS} y1={vy - crossS} x2={vx - crossS} y2={vy + crossS}
                    stroke="white" strokeWidth="1.2" style={{ opacity: 0.7 }}
                  />
                </>
              )}
              {showLabel && (
                <text
                  x={vx + lbl.dx} y={vy + lbl.dy}
                  textAnchor={lbl.anchor}
                  fill={color} style={{ opacity: 0.8 }} fontSize="11" fontFamily="monospace"
                >
                  {probe.name}
                </text>
              )}
              <circle
                cx={vx} cy={vy} r={14}
                fill="transparent"
                style={{ cursor: "pointer" }}
                onMouseEnter={(e) => {
                  const enriched: Voyager = realPt
                    ? { ...probe, distance: realPt.distance, speed: realPt.speedKms }
                    : probe;
                  openVoyagerTooltip(e, enriched);
                }}
                onMouseLeave={scheduleClose}
              />
            </g>
          );
        })}
      </svg>

      {/* ── Scale toggle + Size ×1/×5/×20 — top-left ─────────────────────── */}
      <div className="absolute top-2 left-2 z-20 flex flex-col gap-1 rounded-lg border border-white/10 bg-black/70 px-2 py-1.5 backdrop-blur-sm">
        <div className="flex items-center gap-0.5">
          {(["log", "linear"] as const).map((s) => (
            <button
              key={s}
              onClick={() => { setScale(s); onScaleChange?.(s); }}
              className={[
                "px-2 py-0.5 rounded text-[10px] font-mono transition-colors",
                scale === s
                  ? "bg-blue-500/20 text-blue-300 border border-blue-500/40"
                  : "text-white/40 hover:text-white/70",
              ].join(" ")}
            >
              {s === "log" ? "Log" : "Linear"}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-0.5">
          {([1, 5, 15] as const).map((m) => (
            <button
              key={m}
              onClick={() => setSizeMode(m)}
              className={[
                "px-2 py-0.5 rounded text-[10px] font-mono transition-colors",
                sizeMode === m
                  ? "bg-amber-500/20 text-amber-300 border border-amber-500/40"
                  : "text-white/40 hover:text-white/70",
              ].join(" ")}
            >
              ×{m}
            </button>
          ))}
        </div>
      </div>

      {/* ── Linear scale selector — bottom-left ──────────────────────────── */}
      {scale === "linear" && (
        <div className="absolute bottom-2 left-2 z-20 flex flex-col rounded-lg border border-white/10 bg-black/70 px-3 py-2 backdrop-blur-sm">
          <p className="text-[9px] uppercase tracking-widest text-white/30 mb-1.5 text-center">Масштаб</p>
          {SCALE_OPTIONS.map(({ key, label }) => {
            const active = key === scaleKey;
            return (
              <button
                key={key}
                onClick={() => setScaleKey(key)}
                className="flex items-center gap-1.5 py-0.5 w-full text-left"
              >
                <span className={`text-[8px] leading-none transition-colors ${active ? "text-blue-400" : "text-transparent"}`}>●</span>
                <span className={`text-[10px] whitespace-nowrap transition-colors ${active ? "text-blue-300" : "text-white/45 hover:text-white/70"}`}>
                  {label}
                </span>
              </button>
            );
          })}
        </div>
      )}

      {/* ── Layer toggles — bottom-right ─────────────────────────────────── */}
      <div className="absolute bottom-2 right-2 z-20 flex flex-col rounded-lg border border-white/10 bg-black/70 px-3 py-2 backdrop-blur-sm">
        {[
          { key: "pioneer",  label: "Pioneers",             val: showPioneer,  set: setShowPioneer,  color: "#FFB347" },
          { key: "voyagers", label: "Voyagers",              val: showVoyagers, set: setShowVoyagers, color: "#FF6B6B" },
          { key: "cassini",  label: "Cassini",              val: showCassini,  set: setShowCassini,  color: "#9B7DFF" },
          { key: "msgr",     label: "MESSENGER",            val: showMsgr,     set: setShowMsgr,     color: "#00CED1" },
          { key: "nh",       label: "New Horizons",         val: showNH,       set: setShowNH,       color: "#7BE87B" },
          { key: "psp",      label: "Parker Solar Probe",   val: showPSP,      set: setShowPSP,      color: "#FFD700" },
          { key: "seasons",  label: "Сезоны",              val: showSeasons,  set: setShowSeasons,  color: undefined },
          { key: "ny",       label: "Новый год",            val: showNY,       set: setShowNY,       color: undefined },
          { key: "vernal",   label: "Весен. равноденствие", val: showVernal,   set: setShowVernal,   color: undefined },
        ].map(({ key, label, val, set, color }) => (
          <label key={key} className={`flex cursor-pointer select-none items-center gap-2 py-0.5${key === "seasons" ? " mt-1 pt-1 border-t border-white/10" : ""}`}>
            {color && <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: color }} />}
            <span className="flex-1 text-right text-[10px] text-white/55 whitespace-nowrap">{label}</span>
            <input
              type="checkbox"
              checked={val}
              onChange={(e) => set(e.target.checked)}
              className="h-3 w-3 flex-shrink-0 accent-blue-400"
            />
          </label>
        ))}
      </div>

      {/* ── Tooltip ──────────────────────────────────────────────────────── */}
      {tooltip && (
        <div
          className="absolute z-50 pointer-events-none rounded-lg border border-white/10 bg-black/90 p-3 text-xs backdrop-blur-sm"
          style={{ left: tooltip.x, top: tooltip.y, minWidth: 160 }}
        >
          {tooltip.kind === "planet" && (() => {
            const svgAngle = resolveTooltipAngle(tooltip.data.nameEn);
            const lon      = (((-svgAngle) % 360) + 360) % 360;
            const realPt   = currentPositions?.get(tooltip.data.nameEn) ?? null;
            return (
              <div className="space-y-1">
                <p className="font-semibold text-white">
                  {tooltip.data.name}
                  <span className="ml-1.5 text-white/40">({tooltip.data.nameEn})</span>
                </p>
                <p className="text-white/60">
                  Расстояние:{" "}
                  <span className="text-blue-400">
                    {realPt ? realPt.distance.toFixed(3) : tooltip.data.distance} AU
                  </span>
                </p>
                <p className="text-white/60">Долгота: <span className="text-blue-400">{Math.round(lon)}°</span></p>
                {realPt && (
                  <p className="text-white/60">
                    Скорость: <span className="text-emerald-400">{realPt.speedKms.toFixed(2)} км/с</span>
                  </p>
                )}
                <p className="text-white/60">Период: <span className="text-violet-400">{tooltip.data.orbitalPeriod} {yearsLabel(tooltip.data.orbitalPeriod)}</span></p>
              </div>
            );
          })()}
          {tooltip.kind === "voyager" && (() => {
            const realPt      = currentPositions?.get(tooltip.data.name) ?? null;
            const isCompleted = COMPLETED_MISSIONS.has(tooltip.data.name);
            const dispDist    = realPt ? realPt.distance.toFixed(3) : tooltip.data.distance.toFixed(1);
            const dispLon     = realPt ? Math.round(realPt.angle) : Math.round(voyagerAngles[tooltip.data.name] ?? tooltip.data.angle);
            const dispSpeed   = realPt ? realPt.speedKms.toFixed(2) : tooltip.data.speed.toFixed(1);
            const END_DATES: Record<string, string> = {
              "Pioneer 10": "связь потеряна 23.01.2003",
              "Pioneer 11": "связь потеряна 30.11.1995",
              "Cassini":    "15.09.2017",
              "MESSENGER":  "01.05.2015",
            };
            const endDate = END_DATES[tooltip.data.name] ?? null;
            return (
              <div className="space-y-1">
                <p className="font-semibold text-red-400">{tooltip.data.name}</p>
                {isCompleted && !realPt && (
                  <p className="text-amber-400/80 text-[10px]">Миссия завершена{endDate ? ` ${endDate}` : ""}</p>
                )}
                <p className="text-white/60">Расстояние: <span className="text-red-400">{dispDist} AU</span></p>
                {realPt && (
                  <p className="text-white/60">≈ <span className="text-red-400">{(realPt.distanceKm / 1e9).toFixed(3)} млрд км</span></p>
                )}
                <p className="text-white/60">Долгота: <span className="text-red-400">{dispLon}°</span></p>
                <p className="text-white/60">Скорость: <span className="text-red-400">{dispSpeed} км/с</span></p>
                {realPt && (
                  <p className="text-white/60">Сигнал: <span className="text-amber-400">{realPt.signalHMS}</span></p>
                )}
              </div>
            );
          })()}
        </div>
      )}
    </div>
  );
}
