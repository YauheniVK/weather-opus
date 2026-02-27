"use client";

import { useState, useCallback, useRef } from "react";
import type { BodyData, BodyStatus, SpaceDataset, SpacePoint } from "@/types/space";

// ─── Bodies to load ────────────────────────────────────────────────────────────
export const BODIES: Array<{ id: string; label: string; type: "planet" | "probe" }> = [
  { id: "199",       label: "Меркурий",  type: "planet" },
  { id: "299",       label: "Венера",    type: "planet" },
  { id: "399",       label: "Земля",     type: "planet" },
  { id: "499",       label: "Марс",      type: "planet" },
  { id: "599",       label: "Юпитер",   type: "planet" },
  { id: "699",       label: "Сатурн",   type: "planet" },
  { id: "799",       label: "Уран",     type: "planet" },
  { id: "899",       label: "Нептун",   type: "planet" },
  { id: "Voyager_1", label: "Voyager 1", type: "probe"  },
  { id: "Voyager_2", label: "Voyager 2", type: "probe"  },
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

// ─── Helpers ──────────────────────────────────────────────────────────────────
function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
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
  // Dates are parameters — no captured state, so no stale-closure risk.
  const loadBody = useCallback(
    async (bodyId: string, startDate: string, endDate: string): Promise<void> => {
      setBody(bodyId, { status: "loading" });

      const t0  = Date.now();
      const url =
        `/api/horizons` +
        `?body=${encodeURIComponent(bodyId)}` +
        `&startDate=${encodeURIComponent(startDate)}` +
        `&endDate=${encodeURIComponent(endDate)}`;

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
    [loadBody],
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
