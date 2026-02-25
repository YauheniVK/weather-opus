"use client";

import { useState, useRef } from "react";
import { PLANETS, VOYAGERS } from "@/lib/mockData";
import type { Planet, Voyager } from "@/types/space";

// ─── SVG constants ────────────────────────────────────────────────────────────
const CX = 400;
const CY = 400;
const SVG_SIZE = 800;
const MIN_R = 30;
const MAX_R = 355;

// Logarithmic scale: distributes orbits so inner planets aren't all bunched at center
const LOG_MIN = Math.log10(0.39);  // Mercury
const LOG_MAX = Math.log10(30.1);  // Neptune

function orbitRadius(distance: number): number {
  return MIN_R + ((Math.log10(distance) - LOG_MIN) / (LOG_MAX - LOG_MIN)) * (MAX_R - MIN_R);
}

// Visual animation durations in seconds (scaled, not real orbital periods)
const ANIM_DURATIONS: Record<string, number> = {
  Mercury: 7,
  Venus:   18,
  Earth:   28,
  Mars:    52,
  Jupiter: 110,
  Saturn:  260,
  Uranus:  580,
  Neptune: 1150,
};

// Voyager visual radius — just outside Neptune's orbit
const VOYAGER_R = 388;

// ─── Deterministic star positions ─────────────────────────────────────────────
// Uses Math.sin as a cheap seeded pseudo-random to get stable positions
const STAR_DATA = Array.from({ length: 200 }, (_, i) => {
  const px = ((Math.sin(i * 127.1 + 311.7) * 0.5 + 0.5) * 798).toFixed(1);
  const py = ((Math.sin(i * 311.7 + 127.1) * 0.5 + 0.5) * 798).toFixed(1);
  const r  = i % 7 === 0 ? 1.6 : i % 3 === 0 ? 1.0 : 0.6;
  const op = Number((0.2 + (i % 8) * 0.09).toFixed(2));
  return { px, py, r, op };
});

// ─── Tooltip state ─────────────────────────────────────────────────────────────
type TooltipState =
  | { kind: "planet";  data: Planet;  x: number; y: number }
  | { kind: "voyager"; data: Voyager; x: number; y: number }
  | null;

// ─── Component ────────────────────────────────────────────────────────────────
export function SolarSystemMap() {
  const wrapperRef  = useRef<HTMLDivElement>(null);
  const [tooltip, setTooltip] = useState<TooltipState>(null);

  function handlePlanetEnter(e: React.MouseEvent, planet: Planet) {
    if (!wrapperRef.current) return;
    const rect = wrapperRef.current.getBoundingClientRect();
    setTooltip({ kind: "planet", data: planet, x: e.clientX - rect.left + 14, y: e.clientY - rect.top - 12 });
  }

  function handleVoyagerEnter(e: React.MouseEvent, voyager: Voyager) {
    if (!wrapperRef.current) return;
    const rect = wrapperRef.current.getBoundingClientRect();
    setTooltip({ kind: "voyager", data: voyager, x: e.clientX - rect.left + 14, y: e.clientY - rect.top - 12 });
  }

  function handleSVGMouseMove(e: React.MouseEvent<SVGSVGElement>) {
    if (!tooltip || !wrapperRef.current) return;
    const rect = wrapperRef.current.getBoundingClientRect();
    setTooltip(prev => prev ? { ...prev, x: e.clientX - rect.left + 14, y: e.clientY - rect.top - 12 } : null);
  }

  return (
    <div ref={wrapperRef} className="relative w-full" style={{ aspectRatio: "1 / 1", maxWidth: 600, margin: "0 auto" }}>
      <svg
        viewBox={`0 0 ${SVG_SIZE} ${SVG_SIZE}`}
        width="100%"
        height="100%"
        onMouseMove={handleSVGMouseMove}
        onMouseLeave={() => setTooltip(null)}
      >
        {/* ── Background stars ─────────────────────────────────────────── */}
        {STAR_DATA.map((s, i) => (
          <circle key={i} cx={s.px} cy={s.py} r={s.r} fill="white" opacity={s.op} />
        ))}

        {/* ── Orbit rings ──────────────────────────────────────────────── */}
        {PLANETS.map((planet) => (
          <circle
            key={`orbit-${planet.nameEn}`}
            cx={CX} cy={CY}
            r={orbitRadius(planet.distance)}
            fill="none"
            stroke="rgba(255,255,255,0.07)"
            strokeWidth="1"
          />
        ))}

        {/* ── Sun ──────────────────────────────────────────────────────── */}
        <circle cx={CX} cy={CY} r={32} fill="rgba(253,184,19,0.06)" />
        <circle cx={CX} cy={CY} r={22} fill="rgba(253,184,19,0.14)" />
        <circle cx={CX} cy={CY} r={14} fill="#FDB813" />

        {/* ── Planets ──────────────────────────────────────────────────── */}
        {PLANETS.map((planet) => {
          const r   = orbitRadius(planet.distance);
          const dur = ANIM_DURATIONS[planet.nameEn] ?? 60;

          return (
            <g key={planet.nameEn}>
              {/* SMIL rotation animation — from initial angle, one full orbit */}
              <animateTransform
                attributeName="transform"
                attributeType="XML"
                type="rotate"
                from={`${planet.angle} ${CX} ${CY}`}
                to={`${planet.angle + 360} ${CX} ${CY}`}
                dur={`${dur}s`}
                repeatCount="indefinite"
              />

              {/* Saturn rings */}
              {planet.nameEn === "Saturn" && (
                <ellipse
                  cx={CX + r}
                  cy={CY}
                  rx={planet.size * 2.4}
                  ry={planet.size * 0.5}
                  fill="none"
                  stroke="#E4D191"
                  strokeWidth="2.5"
                  strokeOpacity="0.55"
                />
              )}

              {/* Planet body */}
              <circle cx={CX + r} cy={CY} r={planet.size} fill={planet.color} />

              {/* Glow for gas giants */}
              {planet.size >= 10 && (
                <circle
                  cx={CX + r} cy={CY}
                  r={planet.size + 3}
                  fill={planet.color}
                  opacity="0.15"
                />
              )}

              {/* Invisible hit area — larger for easier hovering */}
              <circle
                cx={CX + r}
                cy={CY}
                r={Math.max(planet.size + 5, 10)}
                fill="transparent"
                style={{ cursor: "pointer" }}
                onMouseEnter={(e) => handlePlanetEnter(e, planet)}
                onMouseLeave={() => setTooltip(null)}
              />
            </g>
          );
        })}

        {/* ── Voyagers ─────────────────────────────────────────────────── */}
        {VOYAGERS.map((voyager) => {
          const rad = (voyager.angle * Math.PI) / 180;
          const vx  = CX + VOYAGER_R * Math.cos(rad);
          const vy  = CY - VOYAGER_R * Math.sin(rad);

          return (
            <g key={voyager.name}>
              {/* Dashed trajectory line from Sun */}
              <line
                x1={CX} y1={CY}
                x2={vx}  y2={vy}
                stroke="rgba(255,107,107,0.3)"
                strokeWidth="1"
                strokeDasharray="5 4"
              />
              {/* Probe dot */}
              <circle cx={vx} cy={vy} r={5} fill="#FF6B6B" />
              <circle cx={vx} cy={vy} r={9} fill="rgba(255,107,107,0.2)" />

              {/* Label */}
              <text
                x={vx + 10}
                y={vy + 4}
                fill="rgba(255,107,107,0.8)"
                fontSize="11"
                fontFamily="monospace"
              >
                {voyager.name}
              </text>

              {/* Hit area */}
              <circle
                cx={vx} cy={vy}
                r={14}
                fill="transparent"
                style={{ cursor: "pointer" }}
                onMouseEnter={(e) => handleVoyagerEnter(e, voyager)}
                onMouseLeave={() => setTooltip(null)}
              />
            </g>
          );
        })}
      </svg>

      {/* ── Tooltip ──────────────────────────────────────────────────────── */}
      {tooltip && (
        <div
          className="absolute z-50 pointer-events-none rounded-lg border border-white/10 bg-black/90 p-3 text-xs backdrop-blur-sm"
          style={{ left: tooltip.x, top: tooltip.y, minWidth: 160 }}
        >
          {tooltip.kind === "planet" && (
            <div className="space-y-1">
              <p className="font-semibold text-white">
                {tooltip.data.name}
                <span className="ml-1.5 text-white/40">({tooltip.data.nameEn})</span>
              </p>
              <p className="text-white/60">
                Расстояние: <span className="text-blue-400">{tooltip.data.distance} AU</span>
              </p>
              <p className="text-white/60">
                Угол: <span className="text-blue-400">{tooltip.data.angle}°</span>
              </p>
            </div>
          )}
          {tooltip.kind === "voyager" && (
            <div className="space-y-1">
              <p className="font-semibold text-red-400">{tooltip.data.name}</p>
              <p className="text-white/60">
                Расстояние: <span className="text-red-400">{tooltip.data.distance} AU</span>
              </p>
              <p className="text-white/60">
                Скорость: <span className="text-red-400">{tooltip.data.speed} км/с</span>
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
