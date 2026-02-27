import { SOLAR_FLARES, GEOMAGNETIC_STORM } from "@/lib/mockData";
import type { SolarFlare, StormColor } from "@/types/space";

// ─── Flare class → color token ────────────────────────────────────────────────
function flareColors(flareClass: string): { badge: string; dot: string } {
  const letter = flareClass.charAt(0).toUpperCase();
  switch (letter) {
    case "X":
      return {
        badge: "bg-red-500/10 border-red-500/30 text-red-400",
        dot:   "bg-red-400",
      };
    case "M":
      return {
        badge: "bg-orange-500/10 border-orange-500/30 text-orange-400",
        dot:   "bg-orange-400",
      };
    case "C":
      return {
        badge: "bg-yellow-500/10 border-yellow-500/30 text-yellow-400",
        dot:   "bg-yellow-400",
      };
    default:
      return {
        badge: "bg-green-500/10 border-green-500/30 text-green-400",
        dot:   "bg-green-400",
      };
  }
}

// ─── Geomagnetic storm → color token ──────────────────────────────────────────
const STORM_STYLES: Record<StormColor, { border: string; text: string; badge: string; dot: string }> = {
  green: {
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
  red: {
    border: "border-red-500/25",
    text:   "text-red-400",
    badge:  "bg-red-500/10 text-red-400",
    dot:    "bg-red-400",
  },
};

// ─── Flare row ────────────────────────────────────────────────────────────────
function FlareRow({ flare }: { flare: SolarFlare }) {
  const colors = flareColors(flare.flareClass);
  const date   = new Date(flare.time);
  const label  = date.toLocaleString("ru-RU", {
    month:  "short",
    day:    "numeric",
    hour:   "2-digit",
    minute: "2-digit",
    timeZone: "UTC",
  }) + " UTC";

  return (
    <div className="flex items-center gap-3 rounded-lg bg-white/5 px-4 py-3">
      {/* Class badge */}
      <span className={`shrink-0 rounded border px-2 py-0.5 text-xs font-bold font-mono ${colors.badge}`}>
        {flare.flareClass}
      </span>

      {/* Details */}
      <div className="flex-1 min-w-0">
        <p className="text-sm text-white/80 truncate">{label}</p>
        <p className="text-xs text-white/40">Регион {flare.region}</p>
      </div>

      {/* Duration */}
      <span className="shrink-0 text-xs text-white/40 font-mono">
        {flare.duration} мин
      </span>

      {/* Color dot */}
      <span className={`shrink-0 h-2 w-2 rounded-full ${colors.dot}`} />
    </div>
  );
}

// ─── Flares panel ─────────────────────────────────────────────────────────────
export function SolarFlares() {
  return (
    <div className="space-y-3">
      <h2 className="text-sm font-semibold uppercase tracking-widest text-amber-400/70">
        Солнечная активность
      </h2>
      <p className="text-xs text-white/40">Последние вспышки</p>
      <div className="space-y-2">
        {SOLAR_FLARES.map((flare, i) => (
          <FlareRow key={i} flare={flare} />
        ))}
      </div>
    </div>
  );
}

// ─── Geomagnetic storm card ────────────────────────────────────────────────────
export function GeomagneticStormCard() {
  const storm  = GEOMAGNETIC_STORM;
  const styles = STORM_STYLES[storm.color];

  return (
    <div className={`rounded-xl border ${styles.border} bg-white/5 p-5 flex flex-col justify-center space-y-3`}>
      <p className="text-xs text-white/40 uppercase tracking-widest">Геомагнитная буря</p>

      <div className="flex items-center gap-3">
        <span className={`h-3 w-3 rounded-full ${styles.dot} shadow-lg`}
              style={{ boxShadow: `0 0 8px 2px currentColor` }} />
        <span className={`text-3xl font-bold ${styles.text}`}>{storm.level}</span>
      </div>

      <p className={`text-sm font-medium ${styles.text}`}>{storm.description}</p>

      <div className={`rounded-lg ${styles.badge} px-3 py-2 text-xs`}>
        Уровень {storm.level} — умеренное воздействие на спутники и электросети
      </div>
    </div>
  );
}

// ─── Combined (legacy) ────────────────────────────────────────────────────────
export function SolarActivity() {
  return (
    <div className="grid gap-4 lg:grid-cols-3">
      <div className="lg:col-span-2"><SolarFlares /></div>
      <GeomagneticStormCard />
    </div>
  );
}
