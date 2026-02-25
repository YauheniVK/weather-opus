"use client";

import { VOYAGERS } from "@/lib/mockData";
import type { Voyager } from "@/types/space";

// ─── Constants ────────────────────────────────────────────────────────────────
const KM_PER_AU       = 149_597_870.7;     // km in 1 AU
const LIGHT_SPEED_KMS = 299_792;           // km/s
const MS_PER_YEAR     = 1000 * 60 * 60 * 24 * 365.25;

// ─── Helpers ──────────────────────────────────────────────────────────────────
function yearsInTransit(launched: string): string {
  const ms    = Date.now() - new Date(launched).getTime();
  const years = ms / MS_PER_YEAR;
  return years.toFixed(1);
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

// ─── Single card ──────────────────────────────────────────────────────────────
function VoyagerCard({ voyager }: { voyager: Voyager }) {
  return (
    <div className="flex-1 rounded-xl border border-red-500/20 bg-red-500/5 p-5 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-white text-base">{voyager.name}</h3>
        <span className="text-xs text-red-400/70 font-mono">
          запущен {launchYear(voyager.launched)}
        </span>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-lg bg-white/5 p-3">
          <p className="text-[10px] uppercase tracking-wider text-white/40 mb-1">Расстояние</p>
          <p className="text-lg font-bold text-red-400 leading-none">{voyager.distance} AU</p>
          <p className="text-xs text-white/40 mt-1">{distanceBillionKm(voyager.distance)} млрд км</p>
        </div>

        <div className="rounded-lg bg-white/5 p-3">
          <p className="text-[10px] uppercase tracking-wider text-white/40 mb-1">Скорость</p>
          <p className="text-lg font-bold text-violet-400 leading-none">{voyager.speed}</p>
          <p className="text-xs text-white/40 mt-1">км/с</p>
        </div>

        <div className="rounded-lg bg-white/5 p-3">
          <p className="text-[10px] uppercase tracking-wider text-white/40 mb-1">Сигнал до Земли</p>
          <p className="text-base font-bold text-amber-400 leading-none">{signalTravelTime(voyager.distance)}</p>
          <p className="text-xs text-white/40 mt-1">при скорости света</p>
        </div>

        <div className="rounded-lg bg-white/5 p-3">
          <p className="text-[10px] uppercase tracking-wider text-white/40 mb-1">В пути</p>
          <p className="text-base font-bold text-blue-400 leading-none">{yearsInTransit(voyager.launched)} лет</p>
          <p className="text-xs text-white/40 mt-1">с {voyager.launched}</p>
        </div>
      </div>
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
      <div className="flex flex-col sm:flex-row gap-4">
        {VOYAGERS.map((v) => (
          <VoyagerCard key={v.name} voyager={v} />
        ))}
      </div>
    </div>
  );
}
