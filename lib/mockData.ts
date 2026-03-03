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
  { name: "Меркурий", nameEn: "Mercury", angle: 236, distance: 0.387, color: "#B5B5B5", size: 3,  orbitalPeriod: 0.24,  eccentricity: 0.20564, perihelionLon:  77.46 },
  { name: "Венера",   nameEn: "Venus",   angle: 353, distance: 0.723, color: "#E8C46A", size: 4,  orbitalPeriod: 0.62,  eccentricity: 0.00676, perihelionLon: 131.53 },
  { name: "Земля",    nameEn: "Earth",   angle: 202, distance: 1.000, color: "#4B9CD3", size: 5,  orbitalPeriod: 1.00,  eccentricity: 0.01671, perihelionLon: 102.94 },
  { name: "Марс",     nameEn: "Mars",    angle:  41, distance: 1.524, color: "#C1440E", size: 4,  orbitalPeriod: 1.88,  eccentricity: 0.09339, perihelionLon: 336.04 },
  { name: "Юпитер",  nameEn: "Jupiter", angle: 246, distance: 5.203, color: "#D4A870", size: 8,  orbitalPeriod: 11.86, eccentricity: 0.04839, perihelionLon:  14.73 },
  { name: "Сатурн",  nameEn: "Saturn",  angle: 357, distance: 9.537, color: "#E4D191", size: 7,  orbitalPeriod: 29.46, eccentricity: 0.05415, perihelionLon:  92.43 },
  { name: "Уран",    nameEn: "Uranus",  angle: 300, distance: 19.19, color: "#7DE8E8", size: 5,  orbitalPeriod: 84.01, eccentricity: 0.04717, perihelionLon: 170.96 },
  { name: "Нептун",  nameEn: "Neptune", angle: 359, distance: 30.07, color: "#5B5EA6", size: 5,  orbitalPeriod: 164.8, eccentricity: 0.00859, perihelionLon:  44.97 },
];

// Probe heliocentric ecliptic J2000 positions — JPL Horizons 2026-02-27
// Active probes shown in static/animate modes; completed missions (Cassini, MESSENGER)
// only appear in real-data animation.
export const VOYAGERS: Voyager[] = [
  { name: "Voyager 1",          angle: 256.72, distance: 169.811, speed: 17.0,  launched: "1977-09-05" },
  { name: "Voyager 2",          angle: 290.68, distance: 142.209, speed: 15.3,  launched: "1977-08-20" },
];

export const PROBES: Voyager[] = [
  // ── Projected positions (contact lost, trajectories extrapolated by JPL) ─
  { name: "Pioneer 10",         angle:  80.18, distance: 140.453, speed: 11.9,  launched: "1972-03-03" },  // contact lost 2003-01-23
  { name: "Pioneer 11",         angle: 284.63, distance: 116.572, speed: 11.1,  launched: "1973-04-06" },  // contact lost 1995-11-30
  // ── Active probes ──────────────────────────────────────────────────────────
  { name: "Voyager 1",          angle: 256.72, distance: 169.811, speed: 17.0,  launched: "1977-09-05" },
  { name: "Voyager 2",          angle: 290.68, distance: 142.209, speed: 15.3,  launched: "1977-08-20" },
  { name: "New Horizons",       angle: 288.39, distance:  64.022, speed: 13.6,  launched: "2006-01-19" },
  { name: "Parker Solar Probe", angle: 348.27, distance:   0.456, speed: 40.0,  launched: "2018-08-12" },
  // ── Completed missions — JPL Horizons actual last positions ────────────────
  // Cassini:   plunged into Saturn 2017-09-15; JPL lon=266.99° dist=10.067 AU
  // MESSENGER: impacted Mercury  2015-04-30; JPL lon=138.09° dist=0.337 AU
  { name: "Cassini",            angle: 266.99, distance: 10.067,  speed:  0,    launched: "1997-10-15" },
  { name: "MESSENGER",          angle: 138.09, distance:  0.337,  speed:  0,    launched: "2004-08-03" },
];

// ─── NASA Images (images-api.nasa.gov) ──────────────────────────────────────
// Curated full-disk or best-available photos per body.
// URL pattern: https://images-assets.nasa.gov/image/{id}/{id}~small.jpg
const _NASA = (id: string) => `https://images-assets.nasa.gov/image/${id}/${id}~small.jpg`;

export const NASA_IMAGES: Record<string, { url: string; credit: string }> = {
  Sun:       { url: _NASA("PIA03149"),  credit: "SDO/NASA"          },
  Mercury:   { url: _NASA("PIA15160"),  credit: "MESSENGER/NASA"    },
  Venus:     { url: _NASA("PIA00257"),  credit: "Magellan/NASA JPL" },
  Earth:     { url: _NASA("GSFC_20171208_Archive_e001386"), credit: "NASA GSFC" },
  Mars:      { url: _NASA("PIA01253"),  credit: "Hubble/NASA"       },
  Jupiter:   { url: _NASA("PIA25726"),  credit: "Juno/NASA JPL"     },
  Saturn:    { url: _NASA("PIA17474"),  credit: "Cassini/NASA JPL"  },
  Uranus:    { url: _NASA("PIA18182"),  credit: "Voyager 2/NASA"    },
  Neptune:   { url: _NASA("PIA01492"),  credit: "Voyager 2/NASA"    },
  "Pioneer 10":         { url: _NASA("ARC-1972-AC72-2135"), credit: "NASA Ames"       },
  "Pioneer 11":         { url: _NASA("ARC-1973-AC73-9019"), credit: "NASA Ames"       },
  "Voyager 1":          { url: _NASA("PIA14111"),           credit: "NASA JPL"        },
  "Voyager 2":          { url: _NASA("PIA14111"),           credit: "NASA JPL"        },
  "Cassini":            { url: _NASA("PIA04603"),           credit: "NASA JPL"        },
  "MESSENGER":          { url: _NASA("PIA18145"),           credit: "JHU APL/NASA"    },
  "New Horizons":       { url: _NASA("PIA22190"),           credit: "NASA JPL"        },
  "Parker Solar Probe": { url: _NASA("KSC-20180419-PH_KLS01_0054"), credit: "NASA KSC" },
};

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
