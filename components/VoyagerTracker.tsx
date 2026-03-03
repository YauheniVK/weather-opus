"use client";

import { PROBES } from "@/lib/mockData";
import type { Voyager } from "@/types/space";

// ─── Constants ────────────────────────────────────────────────────────────────
const MS_PER_YEAR = 1000 * 60 * 60 * 24 * 365.25;

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

// Probe accent colors (matching SolarSystemMap)
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

// Mission status info
const MISSION_STATUS: Record<string, { status: string; note: string; color: string }> = {
  "Pioneer 10":         { status: "Завершена",  note: "Находится в межзвёздном пространстве, связь потеряна 23.01.2003",  color: "#ef4444" },
  "Pioneer 11":         { status: "Завершена",  note: "Находится в межзвёздном пространстве, связь потеряна 30.11.1995",  color: "#ef4444" },
  "Voyager 1":          { status: "Активна",    note: "Находится в межзвёздном пространстве, на связи",                   color: "#22c55e" },
  "Voyager 2":          { status: "Активна",    note: "Находится в межзвёздном пространстве, на связи",                   color: "#22c55e" },
  "Cassini":            { status: "Завершена",  note: "Направлен в атмосферу Сатурна, сгорел 15.09.2017 после 13 лет на орбите",  color: "#ef4444" },
  "MESSENGER":          { status: "Завершена",  note: "Израсходовал топливо, упал на поверхность Меркурия 30.04.2015",          color: "#ef4444" },
  "New Horizons":       { status: "Активна",    note: "Находится в поясе Койпера, на связи",                              color: "#22c55e" },
  "Parker Solar Probe": { status: "Активна",    note: "Изучает солнечную корону, на связи",                               color: "#22c55e" },
};

const MONTH_GEN = [
  "января","февраля","марта","апреля","мая","июня",
  "июля","августа","сентября","октября","ноября","декабря",
];

function formatLaunchDate(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  return `${d} ${MONTH_GEN[m - 1]} ${y}`;
}

function formatDist(au: number): string {
  return au < 1 ? au.toFixed(3) : au.toFixed(1);
}

// ─── Data row ────────────────────────────────────────────────────────────────
function DataRow({ label, value, valueColor }: { label: string; value: string; valueColor: string }) {
  return (
    <div>
      <p className="text-[11px] text-white/35 leading-none mb-1">{label}</p>
      <p className="text-[15px] font-bold font-mono tabular-nums leading-none" style={{ color: valueColor }}>
        {value}
      </p>
    </div>
  );
}

// ─── Probe card ──────────────────────────────────────────────────────────────
function ProbeCard({ probe }: { probe: Voyager }) {
  const yrs    = yearsInTransit(probe.launched);
  const color  = PROBE_COLOR[probe.name] ?? "#FF6B6B";
  const status = MISSION_STATUS[probe.name];
  const ended  = status && status.status === "Завершена";

  return (
    <div
      className="flex-1 min-w-0 rounded-lg border px-3 py-3"
      style={{
        borderColor: `${color}33`,
        backgroundColor: `${color}0D`,
      }}
      title={probe.name}
    >
      {/* Header: name + launch date */}
      <div className="mb-2.5 min-w-0">
        <div className="flex items-baseline gap-1">
          <h3
            className="font-bold text-sm leading-tight truncate"
            style={{ color }}
          >
            {probe.name}
          </h3>
          {ended && (
            <span className="text-[9px] text-white/30 flex-shrink-0">†</span>
          )}
        </div>
        <p className="text-[11px] text-white/35 font-mono truncate">{formatLaunchDate(probe.launched)}</p>
      </div>

      {/* Data rows */}
      <div className="flex flex-col gap-3">
        <DataRow label="Расстояние" value={`${formatDist(probe.distance)} AU`} valueColor="#f87171" />
        <DataRow
          label="Скорость"
          value={probe.speed > 0 ? `${probe.speed.toFixed(1)} км/с` : "—"}
          valueColor="#a78bfa"
        />
        <DataRow label="В пути" value={`${yrs} ${yearsLabel(yrs)}`} valueColor="#60a5fa" />
        {status && (
          <div>
            <p className="text-[11px] text-white/35 leading-none mb-1">Статус миссии</p>
            <p className="text-[12px] font-semibold leading-none" style={{ color: status.color }}>
              {status.status}
            </p>
            <p className="text-[10px] text-white/40 mt-1.5 leading-tight">{status.note}</p>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────
export function VoyagerTracker() {
  return (
    <div className="space-y-2">
      <h2 className="text-sm font-semibold uppercase tracking-widest text-red-400/70">
        Космические зонды
      </h2>
      <div className="flex gap-2">
        {PROBES.map((v) => (
          <ProbeCard key={v.name} probe={v} />
        ))}
      </div>
    </div>
  );
}
