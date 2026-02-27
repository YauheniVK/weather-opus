"use client";

import { VOYAGERS } from "@/lib/mockData";
import type { Voyager } from "@/types/space";

// ─── Constants ────────────────────────────────────────────────────────────────
const KM_PER_AU       = 149_597_870.7;
const LIGHT_SPEED_KMS = 299_792;
const MS_PER_YEAR     = 1000 * 60 * 60 * 24 * 365.25;

// ─── Helpers ──────────────────────────────────────────────────────────────────
function yearsInTransit(launched: string): string {
  return ((Date.now() - new Date(launched).getTime()) / MS_PER_YEAR).toFixed(1);
}

function yearsLabel(y: string): string {
  const f = Math.floor(parseFloat(y));
  const m10 = f % 10, m100 = f % 100;
  if (m100 >= 11 && m100 <= 14) return "лет";
  if (m10 === 1) return "год";
  if (m10 >= 2 && m10 <= 4) return "года";
  return "лет";
}

function distanceBillionKm(au: number): string {
  return ((au * KM_PER_AU) / 1_000_000_000).toFixed(2);
}

function signalTravelTime(au: number): string {
  const seconds = (au * KM_PER_AU) / LIGHT_SPEED_KMS;
  const hours   = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  return `${hours}ч ${minutes}м`;
}

function launchYear(launched: string): string {
  return new Date(launched).getFullYear().toString();
}

// ─── Compact stat row ─────────────────────────────────────────────────────────
function StatRow({
  label,
  value,
  sub,
  color,
}: {
  label: string;
  value: string;
  sub?: string;
  color: string;
}) {
  return (
    <div className="flex items-center justify-between gap-6 py-1.5 border-b border-white/5 last:border-0">
      <span className="text-xs text-white/40 shrink-0">{label}</span>
      <div className="text-right">
        <span className={`text-sm font-bold ${color}`}>{value}</span>
        {sub && <p className="text-[10px] text-white/30 mt-0.5">{sub}</p>}
      </div>
    </div>
  );
}

// ─── Single card ──────────────────────────────────────────────────────────────
function VoyagerCard({ voyager }: { voyager: Voyager }) {
  return (
    <div className="rounded-xl border border-red-500/20 bg-red-500/5 px-4 py-3 space-y-2">
      <div className="flex items-center justify-between mb-1">
        <h3 className="font-semibold text-white text-sm">{voyager.name}</h3>
        <span className="text-xs text-red-400/60 font-mono">запущен {launchYear(voyager.launched)}</span>
      </div>

      <StatRow
        label="Расстояние"
        value={`${voyager.distance} AU`}
        sub={`${distanceBillionKm(voyager.distance)} млрд км`}
        color="text-red-400"
      />
      <StatRow
        label="Скорость"
        value={`${voyager.speed} км/с`}
        color="text-violet-400"
      />
      <StatRow
        label="Сигнал до Земли"
        value={signalTravelTime(voyager.distance)}
        sub="при скорости света"
        color="text-amber-400"
      />
      <StatRow
        label="В пути"
        value={`${yearsInTransit(voyager.launched)} ${yearsLabel(yearsInTransit(voyager.launched))}`}
        sub={`с ${voyager.launched}`}
        color="text-blue-400"
      />
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────
export function VoyagerTracker() {
  return (
    <div className="space-y-3">
      <h2 className="text-sm font-semibold uppercase tracking-widest text-red-400/70">
        Межзвёздные зонды
      </h2>
      <div className="flex flex-col gap-3">
        {VOYAGERS.map((v) => (
          <VoyagerCard key={v.name} voyager={v} />
        ))}
      </div>
    </div>
  );
}
