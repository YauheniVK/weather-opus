"use client";

import { useState, useCallback, useRef } from "react";
import type { BodyData, BodyStatus, SpaceDataset, SpacePoint } from "@/types/space";

// ─── Bodies to load ────────────────────────────────────────────────────────────
export const BODIES: Array<{ id: string; label: string; type: "planet" | "probe" }> = [
  { id: "199",                label: "Меркурий",           type: "planet" },
  { id: "299",                label: "Венера",             type: "planet" },
  { id: "399",                label: "Земля",              type: "planet" },
  { id: "499",                label: "Марс",               type: "planet" },
  { id: "599",                label: "Юпитер",            type: "planet" },
  { id: "699",                label: "Сатурн",            type: "planet" },
  { id: "799",                label: "Уран",              type: "planet" },
  { id: "899",                label: "Нептун",            type: "planet" },
  { id: "Pioneer_10",         label: "Pioneer 10",         type: "probe"  },
  { id: "Pioneer_11",         label: "Pioneer 11",         type: "probe"  },
  { id: "Voyager_1",          label: "Voyager 1",          type: "probe"  },
  { id: "Voyager_2",          label: "Voyager 2",          type: "probe"  },
  { id: "Cassini",            label: "Cassini",            type: "probe"  },
  { id: "MESSENGER",          label: "MESSENGER",          type: "probe"  },
  { id: "New_Horizons",       label: "New Horizons",       type: "probe"  },
  { id: "Parker_Solar_Probe", label: "Parker Solar Probe", type: "probe"  },
];

// ─── Hook return type ─────────────────────────────────────────────────────────
// Dates are passed as parameters to startLoad / retryBody — NOT captured in
// the hook's closure — so there is no stale-date bug when calling right after
// setState in the same event handler.
export interface UseSpaceDataReturn {
  bodies:    BodyData[];
  isLoading: boolean;
  startLoad: (startDate: string, endDate: string) => void;
  retryBody: (bodyId: string, startDate: string, endDate: string) => void;
}

// ─── API response type ─────────────────────────────────────────────────────────
interface HorizonsRouteResponse {
  body?:      string;
  points?:    SpacePoint[];
  count?:     number;
  startDate?: string;
  endDate?:   string;
  error?:     string;
}

// ─── Probe ephemeris start dates ──────────────────────────────────────────────
// JPL Horizons trajectories begin partway through the launch day, so the first
// valid midnight is the day after launch.
const PROBE_EARLIEST: Record<string, string> = {
  Pioneer_10:         "1972-03-04",  // launched 1972-03-03
  Pioneer_11:         "1973-04-07",  // launched 1973-04-06
  Voyager_1:          "1977-09-06",  // launched 1977-09-05 12:56 UTC
  Voyager_2:          "1977-08-21",  // launched 1977-08-20 14:29 UTC
  Cassini:            "1997-10-16",  // launched 1997-10-15
  MESSENGER:          "2004-08-04",  // launched 2004-08-03
  New_Horizons:       "2006-01-20",  // launched 2006-01-19
  Parker_Solar_Probe: "2018-08-13",  // launched 2018-08-12
};

// End of mission / contact lost — ephemeris stops after this date
const PROBE_LATEST: Record<string, string> = {
  Pioneer_10: "2003-01-23",  // contact lost
  Pioneer_11: "1995-11-30",  // contact lost
  Cassini:    "2017-09-15",  // plunged into Saturn
  MESSENGER:  "2015-05-01",  // impacted Mercury
};

// ─── Helpers ──────────────────────────────────────────────────────────────────
function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

/** Generate "YYYY-MM-DD" strings from `from` up to (not including) `to`. */
function dateRange(from: string, to: string): string[] {
  const dates: string[] = [];
  const d = new Date(from + "T00:00:00Z");
  const end = new Date(to + "T00:00:00Z");
  while (d < end) {
    dates.push(d.toISOString().slice(0, 10));
    d.setUTCDate(d.getUTCDate() + 1);
  }
  return dates;
}

function makeInitialBodies(): BodyData[] {
  return BODIES.map((b) => ({
    body:        b.id,
    label:       b.label,
    points:      [],
    status:      "waiting" as BodyStatus,
    pointsCount: 0,
    loadTimeMs:  0,
  }));
}

// ─── Hook ─────────────────────────────────────────────────────────────────────
export function useSpaceData(
  onComplete: (data: SpaceDataset) => void,
): UseSpaceDataReturn {
  const [bodies,    setBodies]    = useState<BodyData[]>(makeInitialBodies);
  const [isLoading, setIsLoading] = useState(false);

  // Mutable mirror of bodies state — safe to read inside async callbacks
  const bodiesRef = useRef<BodyData[]>(makeInitialBodies());

  // Keep onComplete fresh without re-creating every downstream callback
  const onCompleteRef = useRef(onComplete);
  onCompleteRef.current = onComplete;

  const setBody = useCallback((bodyId: string, update: Partial<BodyData>) => {
    bodiesRef.current = bodiesRef.current.map((b) =>
      b.body === bodyId ? { ...b, ...update } : b,
    );
    setBodies([...bodiesRef.current]);
  }, []);

  // ── Load a single body ────────────────────────────────────────────────────
  // For probes, clamp dates to the available ephemeris range.
  const loadBody = useCallback(
    async (bodyId: string, startDate: string, endDate: string): Promise<void> => {
      setBody(bodyId, { status: "loading" });

      const earliest = PROBE_EARLIEST[bodyId];
      const latest   = PROBE_LATEST[bodyId];
      const effectiveStart = earliest && startDate < earliest ? earliest : startDate;
      const effectiveEnd   = latest   && endDate   > latest   ? latest   : endDate;

      // Entire range is outside the ephemeris window → done with 0 points.
      // Backfill will supply Earth coordinates for pre-launch dates.
      if ((earliest && endDate <= earliest) || (latest && startDate >= latest)) {
        setBody(bodyId, { status: "done", points: [], pointsCount: 0, loadTimeMs: 0 });
        return;
      }

      const t0  = Date.now();
      const url =
        `/api/horizons` +
        `?body=${encodeURIComponent(bodyId)}` +
        `&startDate=${encodeURIComponent(effectiveStart)}` +
        `&endDate=${encodeURIComponent(effectiveEnd)}`;

      try {
        const res  = await fetch(url);
        const json = (await res.json()) as HorizonsRouteResponse;

        if (!res.ok || json.error) {
          setBody(bodyId, {
            status:     "error",
            loadTimeMs: Date.now() - t0,
            error:      json.error ?? `HTTP ${res.status}`,
          });
          return;
        }

        setBody(bodyId, {
          status:      "done",
          points:      json.points      ?? [],
          pointsCount: json.count       ?? 0,
          loadTimeMs:  Date.now() - t0,
        });
      } catch (err) {
        setBody(bodyId, {
          status:     "error",
          loadTimeMs: Date.now() - t0,
          error:      err instanceof Error ? err.message : String(err),
        });
      }
    },
    [setBody],
  );

  // ── Sequential loader ─────────────────────────────────────────────────────
  const runSequential = useCallback(
    async (
      idsToLoad: string[],
      startDate: string,
      endDate:   string,
    ): Promise<void> => {
      setIsLoading(true);
      const globalT0 = Date.now();

      for (const bodyDef of BODIES) {
        if (!idsToLoad.includes(bodyDef.id)) continue;
        await loadBody(bodyDef.id, startDate, endDate);
        await sleep(300); // be polite to Horizons
      }

      // ── Backfill probes: pre-launch sentinels + post-mission freeze ────
      // Pre-launch: pad with sentinel points (distance=-1) so the array is
      // aligned with planet arrays. The probe is hidden in the UI when
      // distance < 0. Post-mission: freeze at last real position (speed=0).
      for (const probeId of Object.keys(PROBE_EARLIEST)) {
        const earliest = PROBE_EARLIEST[probeId];
        const probe = bodiesRef.current.find((b) => b.body === probeId);
        if (!probe || probe.status !== "done") continue;

        let pts = probe.points;

        // No real data in this range (probe not yet launched or past end-of-mission) —
        // nothing to align, skip backfill entirely.
        if (pts.length === 0) continue;

        // ── Pre-launch sentinel padding ──────────────────────────────────
        if (startDate < earliest) {
          const preDates = dateRange(startDate, earliest);
          const sentinels: SpacePoint[] = preDates.map((d) => ({
            date: d, x: 0, y: 0, z: 0,
            distance: -1, angle: 0, distanceKm: 0,
            speedKms: 0, signalMinutes: 0, signalHMS: "00:00:00",
          }));
          pts = [...sentinels, ...pts];
        }

        // ── Post-mission freeze ──────────────────────────────────────────
        const latest = PROBE_LATEST[probeId];
        if (latest && endDate > latest && pts.length > 0) {
          const lastReal = pts[pts.length - 1];
          const postDates = dateRange(latest, endDate);
          for (const d of postDates) {
            if (d <= lastReal.date) continue;
            pts.push({
              ...lastReal,
              date:          d,
              speedKms:      0,
              signalMinutes: 0,
              signalHMS:     "00:00:00",
            });
          }
        }

        if (pts !== probe.points) {
          setBody(probeId, { points: pts, pointsCount: pts.length });
        }
      }

      setIsLoading(false);

      const finalBodies = bodiesRef.current;
      onCompleteRef.current({
        bodies:          finalBodies,
        startDate,
        endDate,
        totalPoints:     finalBodies.reduce((s, b) => s + b.pointsCount, 0),
        totalLoadTimeMs: Date.now() - globalT0,
      });
    },
    [loadBody, setBody],
  );

  // ── Public: start full load ────────────────────────────────────────────────
  const startLoad = useCallback(
    (startDate: string, endDate: string) => {
      bodiesRef.current = makeInitialBodies();
      setBodies([...bodiesRef.current]);
      void runSequential(BODIES.map((b) => b.id), startDate, endDate);
    },
    [runSequential],
  );

  // ── Public: retry a single body ───────────────────────────────────────────
  const retryBody = useCallback(
    (bodyId: string, startDate: string, endDate: string) => {
      if (isLoading) return;
      setBody(bodyId, { status: "waiting", points: [], pointsCount: 0, error: undefined });

      void (async () => {
        setIsLoading(true);
        await loadBody(bodyId, startDate, endDate);
        setIsLoading(false);

        const finalBodies = bodiesRef.current;
        onCompleteRef.current({
          bodies:          finalBodies,
          startDate,
          endDate,
          totalPoints:     finalBodies.reduce((s, b) => s + b.pointsCount, 0),
          totalLoadTimeMs: 0,
        });
      })();
    },
    [isLoading, loadBody, setBody],
  );

  return { bodies, isLoading, startLoad, retryBody };
}
