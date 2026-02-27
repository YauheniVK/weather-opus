/**
 * Keplerian orbital elements for heliocentric ecliptic longitudes (TRUE, not mean).
 *
 * Source: JPL "Keplerian Elements for Approximate Positions of the Major Planets"
 *   https://ssd.jpl.nasa.gov/planets/approx_pos.html  (Table 1, valid 1800–2050 AD)
 *
 * The mean longitude L is corrected via Kepler's equation to give TRUE ecliptic longitude.
 * Accuracy: ~0.5–2° for inner planets, ~2–5° for outer planets.
 * Outer-planet residual error comes from mutual perturbations (Jupiter–Saturn interaction etc.)
 * which are not captured by single-body Keplerian elements.
 */

interface OrbitalElements {
  L0: number;      // Mean longitude at J2000 (degrees)
  Ldot: number;    // Mean motion (degrees/century)
  e0: number;      // Eccentricity at J2000
  peri0: number;   // Longitude of perihelion at J2000 = Ω + ω (degrees)
  periDot: number; // Rate of longitude of perihelion (degrees/century)
}

/** J2000.0 orbital elements, keyed by English planet name. */
const ELEMENTS: Record<string, OrbitalElements> = {
  Mercury: { L0: 252.25032350, Ldot: 149472.67411175, e0: 0.20563593, peri0:  77.45779628, periDot: 0.16047689 },
  Venus:   { L0: 181.97909950, Ldot:  58517.81538729, e0: 0.00677672, peri0: 131.60246718, periDot: 0.00268329 },
  Earth:   { L0: 100.46457166, Ldot:  35999.37244981, e0: 0.01671123, peri0: 102.93768193, periDot: 0.32327364 },
  Mars:    { L0:  -4.55343205, Ldot:  19140.30268499, e0: 0.09339410, peri0: -23.94362959, periDot: 0.44441088 },
  Jupiter: { L0:  34.39644051, Ldot:   3034.74612775, e0: 0.04838624, peri0:  14.72847983, periDot: 0.18199196 },
  Saturn:  { L0:  49.95424423, Ldot:   1222.49362201, e0: 0.05386179, peri0:  92.59887831, periDot: 0.83771232 },
  Uranus:  { L0: 313.23810451, Ldot:    428.48202785, e0: 0.04725744, peri0: 170.95427630, periDot: 0.40805281 },
  Neptune: { L0: -55.12002969, Ldot:    218.45945325, e0: 0.00859048, peri0:  44.96476227, periDot: 0.68831688 },
};

/** Julian Date of the J2000.0 epoch (2000 Jan 1.5 TT). */
const J2000_JD = 2451545.0;

function mod360(x: number): number {
  return ((x % 360) + 360) % 360;
}

/**
 * Convert an ISO date string ("YYYY-MM-DD") to Julian Date at midnight UT.
 * Algorithm: Meeus "Astronomical Algorithms", ch. 7.
 */
export function isoToJulian(dateISO: string): number {
  const [y, m, d] = dateISO.split("-").map(Number);
  const a  = Math.floor((14 - m) / 12);
  const yr = y + 4800 - a;
  const mo = m + 12 * a - 3;
  return (
    d +
    Math.floor((153 * mo + 2) / 5) +
    365 * yr +
    Math.floor(yr / 4) -
    Math.floor(yr / 100) +
    Math.floor(yr / 400) -
    32045 -
    0.5  // noon JD → midnight UT
  );
}

/**
 * Solve Kepler's equation  M = E − e·sin(E)  for the eccentric anomaly E.
 * @param Mdeg  Mean anomaly in degrees
 * @param e     Eccentricity
 * @returns     Eccentric anomaly in radians
 */
function solveKepler(Mdeg: number, e: number): number {
  const Mrad = (Mdeg * Math.PI) / 180;
  let E = Mrad + e * Math.sin(Mrad); // first-order seed
  for (let i = 0; i < 50; i++) {
    const dE = (Mrad - E + e * Math.sin(E)) / (1 - e * Math.cos(E));
    E += dE;
    if (Math.abs(dE) < 1e-10) break;
  }
  return E;
}

/**
 * Heliocentric ecliptic longitude of a planet on the given ISO date.
 * Returns TRUE ecliptic longitude in degrees [0, 360).
 *
 * Method:
 *   1. Compute mean longitude L and longitude of perihelion ω̄ at epoch T.
 *   2. Mean anomaly M = L − ω̄.
 *   3. Solve Kepler's equation for eccentric anomaly E.
 *   4. Compute true anomaly ν.
 *   5. True ecliptic longitude λ = ν + ω̄.
 */
export function getEclipticLongitude(planetNameEn: string, dateISO: string): number {
  const el = ELEMENTS[planetNameEn];
  if (!el) return 0;

  const T    = (isoToJulian(dateISO) - J2000_JD) / 36525.0; // Julian centuries since J2000
  const L    = mod360(el.L0 + el.Ldot * T);                  // mean longitude
  const e    = el.e0;                                         // eccentricity (rate negligible)
  const peri = mod360(el.peri0 + el.periDot * T);             // longitude of perihelion ω̄

  // Mean anomaly
  const M = mod360(L - peri);

  // Eccentric anomaly (radians)
  const E = solveKepler(M, e);

  // True anomaly (degrees) from eccentric anomaly
  const nuRad = 2 * Math.atan2(
    Math.sqrt(1 + e) * Math.sin(E / 2),
    Math.sqrt(1 - e) * Math.cos(E / 2),
  );
  const nu = (nuRad * 180) / Math.PI;

  // True heliocentric ecliptic longitude
  return mod360(nu + peri);
}

/**
 * SVG rotation angle for a planet on the given ISO date.
 *
 * The SVG renders planets at (CX+r, CY) then applies rotate(angle, CX, CY).
 * SVG rotate() is clockwise; ecliptic longitude increases counterclockwise.
 * Both share 0° = east (♈ direction), so: svgAngle = −eclipticLongitude (mod 360).
 */
export function getPlanetSVGAngle(planetNameEn: string, dateISO: string): number {
  return mod360(-getEclipticLongitude(planetNameEn, dateISO));
}
