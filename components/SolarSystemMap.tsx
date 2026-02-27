"use client";

import { useState, useRef, useEffect } from "react";
import { PLANETS, VOYAGERS } from "@/lib/mockData";
import { getPlanetSVGAngle } from "@/lib/planetPositions";
import type { Planet, Voyager, SpacePoint } from "@/types/space";

// ─── SVG constants ────────────────────────────────────────────────────────────
const CX = 400;
const CY = 400;
const SVG_SIZE = 800;
const SVG_H    = 920;   // taller than wide so Voyagers fit below the orbital plane
const MIN_R = 30;
const MAX_R = 320;

const LOG_MIN = Math.log10(0.39);
const LOG_MAX = Math.log10(30.1);

function orbitRadius(distance: number): number {
  return MIN_R + ((Math.log10(distance) - LOG_MIN) / (LOG_MAX - LOG_MIN)) * (MAX_R - MIN_R);
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

// Heliosphere boundary zones — shown only in linear mode
const HELIOSPHERE_ZONES = [
  { au: 85,  label: "Терм. удар",  stroke: "rgba(251,191,36,0.22)",  textFill: "rgba(251,191,36,0.60)"  },
  { au: 120, label: "Гелиопауза",  stroke: "rgba(147,197,253,0.28)", textFill: "rgba(147,197,253,0.65)" },
];

// Scale chain: outer → inner; the outermost visible item fills VOYAGER_R in linear mode
const SCALE_CHAIN = [
  { au: 120,   nameEn: "Heliopause" },
  { au: 85,    nameEn: "TermShock"  },
  { au: 30.07, nameEn: "Neptune"    },
  { au: 19.19, nameEn: "Uranus"     },
  { au: 9.537, nameEn: "Saturn"     },
  { au: 5.203, nameEn: "Jupiter"    },
  { au: 1.524, nameEn: "Mars"       },
] as const;

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
  { id: "winter", lineAngle: SA_DEC1, label: "Зима",  labelAngle: ((SA_DEC1 - 4) + 360) % 360, stroke: SEASON_LINE_STROKE, labelColor: "rgba(147,197,253,0.75)", dx:  0, dy:  0 },
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
}

type TooltipState =
  | { kind: "planet";  data: Planet;  x: number; y: number }
  | { kind: "voyager"; data: Voyager; x: number; y: number }
  | null;

// ─── Component ────────────────────────────────────────────────────────────────
export function SolarSystemMap({
  mode, planetAngles, liveAngles, voyagerAngles,
  currentPositions = null, voyagerTrails = null,
}: SolarSystemMapProps) {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const clearRef   = useRef<ReturnType<typeof setTimeout> | null>(null);
  const svgRef     = useRef<SVGSVGElement>(null);

  useEffect(() => {
    if (mode === "animate") svgRef.current?.setCurrentTime(0);
  }, [mode]);

  const [tooltip,       setTooltip]       = useState<TooltipState>(null);
  const [hoveredPlanet, setHoveredPlanet] = useState<string | null>(null);

  // ── Cosmetic layer toggles (log + linear) ────────────────────────────────
  const [showVoyagers, setShowVoyagers] = useState(true); // log mode
  const [showSeasons,  setShowSeasons]  = useState(true);
  const [showNY,       setShowNY]       = useState(true);
  const [showVernal,   setShowVernal]   = useState(true);

  // ── Scale + size toggles ─────────────────────────────────────────────────
  const [scale,    setScale]    = useState<"log" | "linear">("log");
  const [sizeMode, setSizeMode] = useState<1 | 5 | 15>(5);

  // ── Linear outer-object visibility (drives both rendering AND scale) ─────
  const [showVoyagersLin, setShowVoyagersLin] = useState(true);
  const [showHeliopause,  setShowHeliopause]  = useState(true);
  const [showTermShock,   setShowTermShock]   = useState(true);
  const [showNeptune,     setShowNeptune]     = useState(true);
  const [showUranus,      setShowUranus]      = useState(true);
  const [showSaturn,      setShowSaturn]      = useState(true);
  const [showJupiter,     setShowJupiter]     = useState(true);
  const [showMarsLin,     setShowMarsLin]     = useState(true);

  // ── Linear scale computation ──────────────────────────────────────────────
  // Voyagers + Heliopause are visual-only: toggling them does NOT change scale.
  // Scale only changes when TermShock and all items outside it are off.
  const effectiveMaxAU = (() => {
    if (scale !== "linear") return 30.07; // irrelevant for log mode
    if (showTermShock || showHeliopause || showVoyagersLin) return 120; // heliosphere / voyagers → base scale
    if (showNeptune)  return 30.07;
    if (showUranus)   return 19.19;
    if (showSaturn)   return 9.537;
    if (showJupiter)  return 5.203;
    if (showMarsLin)  return 1.524;
    return 1.524;
  })();

  const linPxPerAU = VOYAGER_R / effectiveMaxAU;

  // Key of the item currently acting as scale reference (for the ◀ indicator)
  const activeScaleKey = (() => {
    if (scale !== "linear") return null;
    if (showTermShock || showHeliopause || showVoyagersLin)
      return showHeliopause ? "heliopause" : showTermShock ? "termShock" : "voyagersLin";
    if (showNeptune)  return "neptune";
    if (showUranus)   return "uranus";
    if (showSaturn)   return "saturn";
    if (showJupiter)  return "jupiter";
    if (showMarsLin)  return "mars";
    return null;
  })();

  /** Scale-aware orbit radius (px from centre). */
  function scaledR(distAU: number): number {
    return scale === "linear" ? distAU * linPxPerAU : orbitRadius(distAU);
  }

  /** In linear mode, hide planets whose checkbox is unchecked. */
  function linPlanetVisible(nameEn: string): boolean {
    if (scale !== "linear") return true;
    if (nameEn === "Neptune") return showNeptune;
    if (nameEn === "Uranus")  return showUranus;
    if (nameEn === "Saturn")  return showSaturn;
    if (nameEn === "Jupiter") return showJupiter;
    if (nameEn === "Mars")    return showMarsLin;
    return true;
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
    }, 60);
  }

  function openPlanetTooltip(e: React.MouseEvent, planet: Planet) {
    cancelClose();
    const { x, y } = getPos(e);
    setHoveredPlanet(planet.nameEn);
    setTooltip({ kind: "planet", data: planet, x, y });
  }

  function openVoyagerTooltip(e: React.MouseEvent, voyager: Voyager) {
    cancelClose();
    const { x, y } = getPos(e);
    setHoveredPlanet(null);
    setTooltip({ kind: "voyager", data: voyager, x, y });
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
        const r   = scaledR(pt.distance);
        return { vx: CX + r * Math.cos(rad), vy: CY - r * Math.sin(rad), distance: pt.distance };
      }
    }
    const angle = voyagerAngles[voyager.name] ?? voyager.angle;
    const rad   = (angle * Math.PI) / 180;
    const vr    = scale === "linear" ? voyager.distance * linPxPerAU : VOYAGER_R;
    return { vx: CX + vr * Math.cos(rad), vy: CY - vr * Math.sin(rad), distance: voyager.distance };
  }

  function buildTrailPoints(voyagerName: string): string {
    const trail = voyagerTrails?.get(voyagerName);
    if (!trail || trail.length < 2) return "";
    return trail.map((pt) => {
      const rad = (pt.angle * Math.PI) / 180;
      const r   = scaledR(pt.distance);
      return `${(CX + r * Math.cos(rad)).toFixed(1)},${(CY - r * Math.sin(rad)).toFixed(1)}`;
    }).join(" ");
  }

  // Voyager visibility per mode
  const voyVisible = scale === "linear" ? showVoyagersLin : showVoyagers;

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

        {/* ── Heliosphere zones (linear mode, individually toggled) ─────── */}
        {scale === "linear" && HELIOSPHERE_ZONES.map(({ au, label, stroke, textFill }) => {
          const show = au === 85 ? showTermShock : showHeliopause;
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
          if (!linPlanetVisible(planet.nameEn)) return null;
          const r         = scaledR(planet.distance);
          const isHovered = hoveredPlanet === planet.nameEn;
          if (scale === "linear" && r < MIN_ORBIT_PX) return null;
          return (
            <circle
              key={`orbit-vis-${planet.nameEn}`}
              cx={CX} cy={CY} r={r}
              fill="none"
              stroke={isHovered ? planet.color : "rgba(255,255,255,0.15)"}
              strokeWidth={isHovered ? 2 : 1}
              strokeOpacity={isHovered ? 0.7 : 1}
            />
          );
        })}

        {/* ── Orbit rings — hit areas ───────────────────────────────────── */}
        {PLANETS.map((planet) => {
          if (!linPlanetVisible(planet.nameEn)) return null;
          const r = scaledR(planet.distance);
          if (scale === "linear" && r < MIN_ORBIT_PX) return null;
          return (
            <circle
              key={`orbit-hit-${planet.nameEn}`}
              cx={CX} cy={CY} r={r}
              fill="none"
              stroke="rgba(255,255,255,0.001)"
              strokeWidth={16}
              style={{ cursor: "pointer", pointerEvents: "stroke" }}
              onMouseEnter={(e) => openPlanetTooltip(e, planet)}
              onMouseLeave={scheduleClose}
            />
          );
        })}

        {/* ── Sun ──────────────────────────────────────────────────────── */}
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
        ) : (
          <circle cx={CX} cy={CY} r={sizeMode === 1 ? 1.5 : sizeMode === 5 ? 2 : 3.5} fill="#FDB813" />
        )}

        {/* ── Planets ──────────────────────────────────────────────────── */}
        {PLANETS.map((planet) => {
          if (!linPlanetVisible(planet.nameEn)) return null;
          const r      = scaledR(planet.distance);
          const dur    = ANIM_DURATIONS[planet.nameEn] ?? 60;
          const angle  = resolvePlanetAngle(planet.nameEn);
          const hidden = scale === "linear" && r < MIN_ORBIT_PX;
          const es     = eSize(planet);

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
                      x1={CX + r} y1={CY - 5} x2={CX + r} y2={CY + 5}
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
                    r={sizeMode === 15
                      ? (planet.nameEn === "Jupiter" ? 6 : planet.nameEn === "Saturn" ? 5 : 3.5)
                      : sizeMode === 5
                        ? (planet.nameEn === "Jupiter" ? 6
                            : planet.nameEn === "Saturn" || planet.nameEn === "Uranus" || planet.nameEn === "Neptune" ? 3.5
                            : 2 /* Earth group unchanged */)
                        : /* ×1 — gas giants match Log ×1 */
                          (planet.nameEn === "Jupiter" ? 3
                            : planet.nameEn === "Saturn" || planet.nameEn === "Uranus" || planet.nameEn === "Neptune" ? 2
                            : 1)
                    }
                    fill={planet.color}
                  />
                  {/* Saturn: ellipse rings in ×15, line in ×5, tiny line in ×1 */}
                  {planet.nameEn === "Saturn" && sizeMode === 15 && (
                    <ellipse
                      cx={CX + r} cy={CY}
                      rx={11} ry={2.2}
                      fill="none" stroke="#E4D191" strokeWidth="1.5" strokeOpacity="0.65"
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
                      x1={CX + r} y1={CY - 5} x2={CX + r} y2={CY + 5}
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
          );
        })}

        {/* ── Voyagers ─────────────────────────────────────────────────── */}
        {voyVisible && VOYAGERS.map((voyager) => {
          const { vx, vy } = resolveVoyagerPos(voyager);
          const trailPts = buildTrailPoints(voyager.name);
          const realPt   = currentPositions?.get(voyager.name) ?? null;
          const vDotR  = sizeMode === 15 ? 6 : sizeMode === 5 ? 5 : 2;
          const vGlowR = sizeMode === 15 ? 11 : sizeMode === 5 ? 9 : 4;

          return (
            <g key={voyager.name}>
              {trailPts && (
                <polyline
                  points={trailPts}
                  fill="none"
                  stroke="rgba(255,107,107,0.45)"
                  strokeWidth="1.5"
                  strokeDasharray="4 3"
                />
              )}
              {!currentPositions && (
                <line
                  x1={CX} y1={CY} x2={vx} y2={vy}
                  stroke="rgba(255,107,107,0.3)" strokeWidth="1" strokeDasharray="5 4"
                />
              )}
              <circle cx={vx} cy={vy} r={vDotR}  fill="#FF6B6B" />
              <circle cx={vx} cy={vy} r={vGlowR} fill="rgba(255,107,107,0.2)" />
              <text x={vx + 10} y={vy + 4} fill="rgba(255,107,107,0.8)" fontSize="13" fontFamily="monospace">
                {voyager.name}
              </text>
              <circle
                cx={vx} cy={vy} r={14}
                fill="transparent"
                style={{ cursor: "pointer" }}
                onMouseEnter={(e) => {
                  const enriched: Voyager = realPt
                    ? { ...voyager, distance: realPt.distance, speed: realPt.speedKms }
                    : voyager;
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
              onClick={() => setScale(s)}
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

      {/* ── Linear scale panel — bottom-left ─────────────────────────────── */}
      {scale === "linear" && (
        <div className="absolute bottom-2 left-2 z-20 flex flex-col rounded-lg border border-white/10 bg-black/70 px-3 py-2 backdrop-blur-sm">
          {/* Voyagers — can determine scale when heliosphere zones are off */}
          <label className="flex cursor-pointer select-none items-center gap-1.5 py-0.5 mb-1 pb-1.5 border-b border-white/10">
            <span className={`text-[8px] leading-none transition-colors ${activeScaleKey === "voyagersLin" ? "text-blue-400" : "text-transparent"}`}>◀</span>
            <span className={`flex-1 text-right text-[10px] whitespace-nowrap transition-colors ${activeScaleKey === "voyagersLin" ? "text-blue-300" : "text-white/55"}`}>
              Вояджеры
            </span>
            <input
              type="checkbox"
              checked={showVoyagersLin}
              onChange={(e) => setShowVoyagersLin(e.target.checked)}
              className="h-3 w-3 flex-shrink-0 accent-blue-400"
            />
          </label>

          {/* Scale chain items — outermost visible one determines scale */}
          {([
            { key: "heliopause", label: "Гелиопауза", val: showHeliopause, set: setShowHeliopause },
            { key: "termShock",  label: "Терм. удар",  val: showTermShock,  set: setShowTermShock  },
            { key: "neptune",    label: "Нептун",      val: showNeptune,    set: setShowNeptune    },
            { key: "uranus",     label: "Уран",        val: showUranus,     set: setShowUranus     },
            { key: "saturn",     label: "Сатурн",      val: showSaturn,     set: setShowSaturn     },
            { key: "jupiter",    label: "Юпитер",      val: showJupiter,    set: setShowJupiter    },
            { key: "mars",       label: "Марс",        val: showMarsLin,    set: setShowMarsLin    },
          ] as const).map(({ key, label, val, set }) => {
            const isActive = key === activeScaleKey;
            return (
              <label key={key} className="flex cursor-pointer select-none items-center gap-1.5 py-0.5">
                {/* scale indicator dot */}
                <span className={`text-[8px] leading-none transition-colors ${isActive ? "text-blue-400" : "text-transparent"}`}>◀</span>
                <span className={`flex-1 text-right text-[10px] whitespace-nowrap transition-colors ${isActive ? "text-blue-300" : "text-white/55"}`}>
                  {label}
                </span>
                <input
                  type="checkbox"
                  checked={val}
                  onChange={(e) => set(e.target.checked)}
                  className="h-3 w-3 flex-shrink-0 accent-blue-400"
                />
              </label>
            );
          })}
        </div>
      )}

      {/* ── Layer toggles — bottom-right ─────────────────────────────────── */}
      <div className="absolute bottom-2 right-2 z-20 flex flex-col rounded-lg border border-white/10 bg-black/70 px-3 py-2 backdrop-blur-sm">
        {[
          { key: "voyagers", label: "Зонды",               val: showVoyagers, set: setShowVoyagers },
          { key: "seasons",  label: "Сезоны",              val: showSeasons,  set: setShowSeasons  },
          { key: "ny",       label: "Новый год",            val: showNY,       set: setShowNY       },
          { key: "vernal",   label: "Весен. равноденствие", val: showVernal,   set: setShowVernal   },
        ].map(({ key, label, val, set }) => (
          <label key={key} className="flex cursor-pointer select-none items-center gap-2 py-0.5">
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
            const realPt    = currentPositions?.get(tooltip.data.name) ?? null;
            const dispDist  = realPt ? realPt.distance.toFixed(3) : tooltip.data.distance.toFixed(1);
            const dispLon   = realPt ? Math.round(realPt.angle) : Math.round(voyagerAngles[tooltip.data.name] ?? tooltip.data.angle);
            const dispSpeed = realPt ? realPt.speedKms.toFixed(2) : tooltip.data.speed.toFixed(1);
            return (
              <div className="space-y-1">
                <p className="font-semibold text-red-400">{tooltip.data.name}</p>
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
