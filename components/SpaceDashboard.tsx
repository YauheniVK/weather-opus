"use client";

import { SolarSystemMap } from "@/components/SolarSystemMap";
import { VoyagerTracker }  from "@/components/VoyagerTracker";
import { SolarActivity }   from "@/components/SolarActivity";

// ─── CSS star field ────────────────────────────────────────────────────────────
// Deterministic star positions generated via Math.sin seeded sequence.
// Rendered as a 1×1px element with many box-shadows — the classic CSS stars trick.
function buildStarShadows(count: number): string {
  const shadows: string[] = [];
  for (let i = 0; i < count; i++) {
    const x    = Math.abs(Math.round(Math.sin(i * 127.1 + 311.7) * 960 + 960)) % 1920;
    const y    = Math.abs(Math.round(Math.cos(i * 311.7 + 127.1) * 540 + 540)) % 1080;
    const size = i % 13 === 0 ? "1.5px" : i % 5 === 0 ? "1px" : "0px";
    const op   = (0.25 + (i % 9) * 0.08).toFixed(2);
    shadows.push(`${x}px ${y}px 0 ${size} rgba(255,255,255,${op})`);
  }
  return shadows.join(", ");
}

const STAR_SHADOWS = buildStarShadows(220);

const STAR_CSS = `
.space-starfield::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  width: 1px;
  height: 1px;
  pointer-events: none;
  z-index: 0;
  box-shadow: ${STAR_SHADOWS};
}
`;

// ─── Component ────────────────────────────────────────────────────────────────
export default function SpaceDashboard() {
  return (
    <>
      <style>{STAR_CSS}</style>

      <div className="space-starfield relative overflow-hidden rounded-xl bg-[#060614] p-5 sm:p-7 space-y-8">
        {/* ── Demo mode banner ───────────────────────────────────────────── */}
        <div className="relative z-10 flex items-start gap-3 rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-300">
          <span className="text-base shrink-0 mt-0.5">⚠️</span>
          <span>
            <strong>Демо-режим</strong> — данные захардкожены. Реальные данные подключаются на следующем шаге.
          </span>
        </div>

        {/* ── Solar system map ───────────────────────────────────────────── */}
        <div className="relative z-10 space-y-3">
          <h2 className="text-sm font-semibold uppercase tracking-widest text-blue-400/70">
            Солнечная система · 26 фев 2025
          </h2>
          <div className="rounded-xl overflow-hidden bg-black/40 border border-white/5">
            <SolarSystemMap />
          </div>
          <p className="text-xs text-white/30 text-center">
            Орбиты в логарифмическом масштабе · Наведите на планету или зонд для деталей
          </p>
        </div>

        {/* ── Voyager tracker ────────────────────────────────────────────── */}
        <div className="relative z-10">
          <VoyagerTracker />
        </div>

        {/* ── Solar activity ─────────────────────────────────────────────── */}
        <div className="relative z-10">
          <SolarActivity />
        </div>
      </div>
    </>
  );
}
