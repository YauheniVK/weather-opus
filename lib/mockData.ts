import type { Planet, Voyager, SolarFlare, GeomagneticStorm } from "@/types/space";

// ─── JPL Horizons reference epoch ────────────────────────────────────────────
// Heliocentric ecliptic J2000 longitudes from NASA JPL Horizons API.
// Source: EPHEM_TYPE=VECTORS, CENTER=500@10 (Sun), REF_PLANE=ECLIPTIC, REF_SYSTEM=J2000
// Retrieved: 2026-02-27 00:00 TDB
//
// XYZ → lon = atan2(Y, X) in [0°, 360°), dist = sqrt(X²+Y²+Z²)
//
// Mercury  X=-0.178334  Y= 0.268436  Z= 0.038294  → lon=123.60°  dist=0.325 AU
// Venus    X= 0.719045  Y= 0.092381  Z=-0.040219  → lon=  7.32°  dist=0.726 AU
// Earth    X=-0.918369  Y= 0.370391  Z=-0.000019  → lon=158.04°  dist=0.990 AU
// Mars     X= 1.043011  Y=-0.912591  Z=-0.044700  → lon=318.82°  dist=1.387 AU
// Jupiter  X=-2.099954  Y= 4.792555  Z= 0.027075  → lon=113.66°  dist=5.233 AU
// Saturn   X= 9.475646  Y= 0.574708  Z=-0.387195  → lon=  3.47°  dist=9.501 AU
// Uranus   X= 9.684371  Y=16.902093  Z=-0.062799  → lon= 60.19° dist=19.480 AU
// Neptune  X=29.866922  Y= 0.698869  Z=-0.702654  → lon=  1.34° dist=29.883 AU
// Voyager1 X=-31.904645 Y=-135.126568 Z=97.768557 → lon=256.72° dist=169.811 AU
// Voyager2 X=39.365907  Y=-104.299066 Z=-88.291333 → lon=290.68° dist=142.209 AU

export const JPL_EPOCH = "2026-02-27";

/**
 * Real heliocentric ecliptic J2000 longitudes (degrees) on JPL_EPOCH.
 * Used to anchor the Keplerian formula so Static/Animate modes start
 * from verified JPL positions. Date mode continues to use the formula only.
 */
export const JPL_ECL_LON: Record<string, number> = {
  Mercury: 123.60,
  Venus:     7.32,
  Earth:   158.04,
  Mars:    318.82,
  Jupiter: 113.66,
  Saturn:    3.47,
  Uranus:   60.19,
  Neptune:   1.34,
};

// Planet semi-major axes used for orbit ring radii (AU, essentially constant).
// angle field = SVG angle on JPL_EPOCH (= mod360(-eclLon)), kept for reference only;
// actual positioning is done via getEclipticLongitude() + JPL correction in SpaceDashboard.
export const PLANETS: Planet[] = [
  { name: "Меркурий", nameEn: "Mercury", angle: 236, distance: 0.387, color: "#B5B5B5", size: 3,  orbitalPeriod: 0.24  },
  { name: "Венера",   nameEn: "Venus",   angle: 353, distance: 0.723, color: "#E8C46A", size: 4,  orbitalPeriod: 0.62  },
  { name: "Земля",    nameEn: "Earth",   angle: 202, distance: 1.000, color: "#4B9CD3", size: 5,  orbitalPeriod: 1.00  },
  { name: "Марс",     nameEn: "Mars",    angle:  41, distance: 1.524, color: "#C1440E", size: 4,  orbitalPeriod: 1.88  },
  { name: "Юпитер",  nameEn: "Jupiter", angle: 246, distance: 5.203, color: "#D4A870", size: 8,  orbitalPeriod: 11.86 },
  { name: "Сатурн",  nameEn: "Saturn",  angle: 357, distance: 9.537, color: "#E4D191", size: 7,  orbitalPeriod: 29.46 },
  { name: "Уран",    nameEn: "Uranus",  angle: 300, distance: 19.19, color: "#7DE8E8", size: 5,  orbitalPeriod: 84.01 },
  { name: "Нептун",  nameEn: "Neptune", angle: 359, distance: 30.07, color: "#5B5EA6", size: 5,  orbitalPeriod: 164.8 },
];

// Voyager heliocentric ecliptic J2000 positions — JPL Horizons 2026-02-27
export const VOYAGERS: Voyager[] = [
  { name: "Voyager 1", angle: 256.72, distance: 169.811, speed: 17.0, launched: "1977-09-05" },
  { name: "Voyager 2", angle: 290.68, distance: 142.209, speed: 15.3, launched: "1977-08-20" },
];

export const SOLAR_FLARES: SolarFlare[] = [
  { flareClass: "M2.3", time: "2025-02-26T04:22Z", region: "AR3576", duration: 18 },
  { flareClass: "C8.1", time: "2025-02-25T19:45Z", region: "AR3574", duration: 9  },
  { flareClass: "X1.1", time: "2025-02-25T11:30Z", region: "AR3576", duration: 32 },
];

export const GEOMAGNETIC_STORM: GeomagneticStorm = {
  level: "G2",
  description: "Умеренная буря",
  color: "yellow",
};
