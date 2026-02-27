import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import type { SpacePoint } from "@/types/space";

export const dynamic = "force-dynamic";

// ─── Body ID mapping ──────────────────────────────────────────────────────────
// Friendly names → Horizons NAIF IDs.
// Negative IDs (spacecraft) are stored WITHOUT single quotes here;
// they are quoted in the URL construction below.
const BODY_ID_MAP: Record<string, string> = {
  Voyager_1: "-31",
  Voyager_2: "-32",
};

// ─── Physical constants ───────────────────────────────────────────────────────
const AU_KM            = 149_597_870.7;   // 1 AU in km
const AU_DAY_TO_KM_S   = AU_KM / 86_400; // 1 AU/day → km/s  ≈ 1731.457 km/s

// ─── Horizons month abbreviation → ISO 2-digit month ─────────────────────────
const MONTH_MAP: Record<string, string> = {
  Jan: "01", Feb: "02", Mar: "03", Apr: "04", May: "05", Jun: "06",
  Jul: "07", Aug: "08", Sep: "09", Oct: "10", Nov: "11", Dec: "12",
};

// ─── Types ────────────────────────────────────────────────────────────────────
interface ParsedPoint {
  date: string;
  x:   number;  // AU
  y:   number;  // AU
  z:   number;  // AU
  vx:  number;  // AU/day
  vy:  number;  // AU/day
  vz:  number;  // AU/day
  lt:  number;  // light travel time, days
  rg:  number;  // heliocentric range, AU
}

interface HorizonsApiResponse {
  result?: string;
  error?:  string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function mod360(x: number): number {
  return ((x % 360) + 360) % 360;
}

/** "2023-Feb-24" → "2023-02-24" */
function parseHorizonsDate(raw: string): string {
  const [y, m, d] = raw.split("-");
  const mon = MONTH_MAP[m];
  if (!mon) return raw;
  return `${y}-${mon}-${d.padStart(2, "0")}`;
}

/** Total seconds → "HH:MM:SS" */
function secondsToHMS(totalSeconds: number): string {
  const s   = Math.floor(totalSeconds);
  const h   = Math.floor(s / 3600);
  const min = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  return [h, min, sec].map((v) => String(v).padStart(2, "0")).join(":");
}

/**
 * Parse the $$SOE … $$EOE block from a Horizons VECTORS response.
 *
 * Each record occupies 4 non-empty lines:
 *   Line 0: <JD> = A.D. YYYY-Mon-DD HH:MM:SS.ffff TDB
 *   Line 1: X = <val> Y = <val> Z = <val>
 *   Line 2: VX= <val> VY= <val> VZ= <val>
 *   Line 3: LT= <val> RG= <val> RR= <val>
 */
function parseHorizonsText(text: string): ParsedPoint[] {
  const soeIdx = text.indexOf("$$SOE");
  const eoeIdx = text.indexOf("$$EOE");
  if (soeIdx === -1 || eoeIdx === -1) return [];

  const section = text.slice(soeIdx + 5, eoeIdx);
  const lines   = section.split("\n").map((l) => l.trim()).filter((l) => l.length > 0);

  // Pattern matches any scientific-notation float, e.g. -1.234567890123E+00
  const FLOAT = /[+-]?\d+\.?\d*[Ee][+-]?\d+/g;

  const points: ParsedPoint[] = [];
  let i = 0;

  while (i + 3 < lines.length) {
    // ── Line 0: date ─────────────────────────────────────────────────────────
    const dateMatch = lines[i].match(/A\.D\.\s+(\d{4}-[A-Za-z]{3}-\d{2})/);
    if (!dateMatch) { i++; continue; }
    const dateStr = parseHorizonsDate(dateMatch[1]);

    // ── Line 1: X Y Z ────────────────────────────────────────────────────────
    const xyzVals = lines[i + 1].match(FLOAT);
    if (!xyzVals || xyzVals.length < 3) { i += 4; continue; }

    // ── Line 2: VX VY VZ ─────────────────────────────────────────────────────
    const velVals = lines[i + 2].match(FLOAT);
    if (!velVals || velVals.length < 3) { i += 4; continue; }

    // ── Line 3: LT RG RR ─────────────────────────────────────────────────────
    const ltVals = lines[i + 3].match(FLOAT);
    if (!ltVals || ltVals.length < 2) { i += 4; continue; }

    points.push({
      date: dateStr,
      x:   parseFloat(xyzVals[0]),
      y:   parseFloat(xyzVals[1]),
      z:   parseFloat(xyzVals[2]),
      vx:  parseFloat(velVals[0]),
      vy:  parseFloat(velVals[1]),
      vz:  parseFloat(velVals[2]),
      lt:  parseFloat(ltVals[0]),
      rg:  parseFloat(ltVals[1]),
    });

    i += 4;
  }

  return points;
}

/** Convert internal parsed point → public SpacePoint */
function toSpacePoint(p: ParsedPoint): SpacePoint {
  const speedAUperDay = Math.sqrt(p.vx ** 2 + p.vy ** 2 + p.vz ** 2);
  const ltSeconds     = p.lt * 86_400;

  return {
    date:          p.date,
    x:             p.x,
    y:             p.y,
    z:             p.z,
    distance:      p.rg,
    angle:         mod360((Math.atan2(p.y, p.x) * 180) / Math.PI),
    distanceKm:    p.rg * AU_KM,
    speedKms:      speedAUperDay * AU_DAY_TO_KM_S,
    signalMinutes: ltSeconds / 60,
    signalHMS:     secondsToHMS(ltSeconds),
  };
}

// ─── Route handler ────────────────────────────────────────────────────────────
export async function GET(req: NextRequest): Promise<NextResponse> {
  const sp        = req.nextUrl.searchParams;
  const bodyParam = sp.get("body");
  const startDate = sp.get("startDate");
  const endDate   = sp.get("endDate");
  const stepSize  = sp.get("stepSize") ?? "1d";

  if (!bodyParam || !startDate || !endDate) {
    return NextResponse.json(
      { error: "Missing required params: body, startDate, endDate" },
      { status: 400 },
    );
  }

  const horizonsId = BODY_ID_MAP[bodyParam] ?? bodyParam;

  // Spacecraft with negative NAIF IDs (e.g. -31 for Voyager 1) must be wrapped
  // in single quotes in the Horizons API to avoid ambiguity with asteroid
  // designations.  URLSearchParams would percent-encode the quotes, so we build
  // the COMMAND segment manually and keep the remaining params URL-encoded.
  const commandStr = horizonsId.startsWith("-")
    ? `'${horizonsId}'`   // e.g.  '-31'   (literal single quotes, valid in URL)
    : horizonsId;         // e.g.   199

  const otherParams = new URLSearchParams({
    format:     "json",
    OBJ_DATA:   "NO",
    MAKE_EPHEM: "YES",
    EPHEM_TYPE: "VECTORS",
    CENTER:     "500@10",     // heliocentric
    START_TIME: startDate,
    STOP_TIME:  endDate,
    STEP_SIZE:  stepSize,
    VEC_TABLE:  "3",          // XYZ + velocity + LT/RG/RR (required by parser)
    REF_PLANE:  "ECLIPTIC",
    REF_SYSTEM: "J2000",
    VEC_CORR:   "NONE",
    VEC_LABELS: "YES",
    OUT_UNITS:  "AU-D",       // AU, AU/day
  });

  const url =
    `https://ssd.jpl.nasa.gov/api/horizons.api` +
    `?COMMAND=${commandStr}&${otherParams.toString()}`;

  console.log(
    `[horizons] → body=${bodyParam} (id=${horizonsId}) range=${startDate}..${endDate} step=${stepSize}`,
  );

  let rawText: string;

  try {
    const controller = new AbortController();
    const timer      = setTimeout(() => controller.abort(), 30_000);

    const res = await fetch(url, { signal: controller.signal });
    clearTimeout(timer);

    if (!res.ok) {
      return NextResponse.json(
        { error: `Horizons HTTP ${res.status}: ${res.statusText}` },
        { status: 502 },
      );
    }

    const json = (await res.json()) as HorizonsApiResponse;

    // Log first 500 chars of the raw result for debugging
    console.log(
      `[horizons] ← raw result preview: ${JSON.stringify(json.result ?? "").slice(0, 500)}`,
    );

    if (json.error) {
      return NextResponse.json({ error: `Horizons error: ${json.error}` }, { status: 502 });
    }

    rawText = json.result ?? "";
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: `Fetch failed: ${msg}` }, { status: 502 });
  }

  // ── Parse ─────────────────────────────────────────────────────────────────
  if (!rawText.includes("$$SOE")) {
    console.error("[horizons] $$SOE not found. Raw (first 1000):", rawText.slice(0, 1_000));
    return NextResponse.json({ error: "parse_error: $$SOE not found" }, { status: 500 });
  }

  const parsed = parseHorizonsText(rawText);
  const points = parsed.map(toSpacePoint);

  console.log(`[horizons] ✓ body=${bodyParam} points=${points.length}`);

  return NextResponse.json({
    body:      bodyParam,
    points,
    count:     points.length,
    startDate,
    endDate,
  });
}
