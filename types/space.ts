// ─── NASA Horizons data types ─────────────────────────────────────────────────

export interface SpacePoint {
  date:          string;  // "YYYY-MM-DD"
  x:             number;  // AU
  y:             number;  // AU
  z:             number;  // AU
  distance:      number;  // AU (heliocentric range)
  angle:         number;  // degrees [0, 360) — heliocentric ecliptic longitude
  distanceKm:    number;  // km
  speedKms:      number;  // km/s
  signalMinutes: number;  // light travel time, minutes
  signalHMS:     string;  // light travel time, "HH:MM:SS"
}

export type BodyStatus = "waiting" | "loading" | "done" | "error";

export interface BodyData {
  body:        string;       // Horizons ID or friendly name
  label:       string;       // human-readable name, e.g. "Юпитер"
  points:      SpacePoint[];
  status:      BodyStatus;
  pointsCount: number;
  loadTimeMs:  number;
  error?:      string;
}

export interface SpaceDataset {
  bodies:         BodyData[];
  startDate:      string;
  endDate:        string;
  totalPoints:    number;
  totalLoadTimeMs: number;
}

// ─── Static mock types ────────────────────────────────────────────────────────

export interface Planet {
  name: string;
  nameEn: string;
  angle: number;
  distance: number;
  color: string;
  size: number;
  orbitalPeriod: number; // Earth years
}

export interface Voyager {
  name: string;
  angle: number;
  distance: number;
  speed: number;
  launched: string;
}

export interface SolarFlare {
  flareClass: string;
  time: string;
  region: string;
  duration: number;
}

export type StormColor = "green" | "yellow" | "red";

export interface GeomagneticStorm {
  level: string;
  description: string;
  color: StormColor;
}
