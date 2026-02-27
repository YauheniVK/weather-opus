"use client";

import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import type { SpaceDataset, SpacePoint } from "@/types/space";

// ─── Body ID → English name mapping (for SolarSystemMap lookup by planet.nameEn)
const BODY_EN_NAMES: Record<string, string> = {
  "199":       "Mercury",
  "299":       "Venus",
  "399":       "Earth",
  "499":       "Mars",
  "599":       "Jupiter",
  "699":       "Saturn",
  "799":       "Uranus",
  "899":       "Neptune",
  "Voyager_1": "Voyager 1",
  "Voyager_2": "Voyager 2",
};

// ─── Public API ────────────────────────────────────────────────────────────────
export interface AnimationState {
  currentDate:      string;
  currentPositions: Map<string, SpacePoint> | null;
  isPlaying:        boolean;
  speed:            number;   // days per second
  progress:         number;   // 0–100
  play:             () => void;
  pause:            () => void;
  reset:            () => void;
  setSpeed:         (s: number) => void;
  seekToDate:       (iso: string) => void;
  seekToProgress:   (pct: number) => void;
}

// ─── Interpolation helper ──────────────────────────────────────────────────────
function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

/**
 * Linearly interpolate between two SpacePoints.
 * Angle is interpolated on the shorter arc (handles 0/360 wrap).
 */
function interpolatePoint(a: SpacePoint, b: SpacePoint, t: number): SpacePoint {
  const da    = ((b.angle - a.angle + 540) % 360) - 180; // delta in [-180, 180]
  const angle = ((a.angle + da * t) + 360) % 360;

  return {
    date:          b.date,
    x:             lerp(a.x, b.x, t),
    y:             lerp(a.y, b.y, t),
    z:             lerp(a.z, b.z, t),
    distance:      lerp(a.distance, b.distance, t),
    angle,
    distanceKm:    lerp(a.distanceKm, b.distanceKm, t),
    speedKms:      lerp(a.speedKms, b.speedKms, t),
    signalMinutes: lerp(a.signalMinutes, b.signalMinutes, t),
    signalHMS:     a.signalHMS, // use nearest; exact string isn't critical mid-frame
  };
}

// ─── Hook ─────────────────────────────────────────────────────────────────────
export function useAnimation(dataset: SpaceDataset | null): AnimationState {
  // Total number of time steps (all bodies share the same time axis)
  const totalSteps = dataset
    ? Math.max(...dataset.bodies.map((b) => b.points.length))
    : 0;

  // dayIndex drives rendering; dayRef is the authoritative value for the rAF loop.
  // The two must NEVER be synced back (ref ← state) — that reverse sync causes
  // the rAF to reset to a stale rendered value, producing back-and-forth jitter.
  const [dayIndex,   setDayIndex]   = useState(0);
  const [isPlaying,  setIsPlaying]  = useState(false);
  const [speed,      setSpeedState] = useState(365); // days/second default

  // rAF bookkeeping — all mutable, never flow back into state
  const rafId    = useRef<number | null>(null);
  const lastTs   = useRef<number | null>(null);
  const dayRef   = useRef(0);   // only written in tick / seek / reset
  const speedRef = useRef(speed); // only written in setSpeed

  // ── rAF loop ────────────────────────────────────────────────────────────────
  const tick = useCallback(
    (timestamp: number) => {
      if (lastTs.current === null) lastTs.current = timestamp;
      const deltaMs   = timestamp - lastTs.current;
      lastTs.current  = timestamp;

      const deltaFrac = (deltaMs / 1_000) * speedRef.current;
      const next      = dayRef.current + deltaFrac;

      if (next >= totalSteps - 1) {
        dayRef.current = totalSteps - 1;
        setDayIndex(totalSteps - 1);
        setIsPlaying(false);
        return;
      }

      dayRef.current = next;
      setDayIndex(next);
      rafId.current = requestAnimationFrame(tick);
    },
    [totalSteps],
  );

  // ── Start / stop rAF based on isPlaying ─────────────────────────────────────
  useEffect(() => {
    if (isPlaying && totalSteps > 1) {
      lastTs.current = null;
      rafId.current  = requestAnimationFrame(tick);
    } else {
      if (rafId.current !== null) {
        cancelAnimationFrame(rafId.current);
        rafId.current = null;
      }
    }
    return () => {
      if (rafId.current !== null) {
        cancelAnimationFrame(rafId.current);
        rafId.current = null;
      }
    };
  }, [isPlaying, tick, totalSteps]);

  // ── Reset when dataset changes ───────────────────────────────────────────────
  useEffect(() => {
    dayRef.current = 0;
    setDayIndex(0);
    setIsPlaying(false);
  }, [dataset]);

  // ── Compute current positions via interpolation ─────────────────────────────
  // useMemo: only recompute when dayIndex or dataset changes, not on every render.
  const currentPositions = useMemo((): Map<string, SpacePoint> | null => {
    if (!dataset || totalSteps === 0) return null;

    const intIdx = Math.floor(dayIndex);
    const frac   = dayIndex - intIdx;
    const map    = new Map<string, SpacePoint>();

    for (const body of dataset.bodies) {
      if (body.points.length === 0) continue;
      const i = Math.min(intIdx, body.points.length - 1);
      const j = Math.min(i + 1, body.points.length - 1);

      const pt = frac > 0 && i !== j
        ? interpolatePoint(body.points[i], body.points[j], frac)
        : body.points[i];

      map.set(body.body,  pt);   // "199", "Voyager_1", …
      map.set(body.label, pt);   // "Меркурий", …
      const en = BODY_EN_NAMES[body.body];
      if (en) map.set(en, pt);   // "Mercury", "Voyager 1", …
    }

    return map;
  }, [dataset, dayIndex, totalSteps]);

  // ── Current date string ─────────────────────────────────────────────────────
  const currentDate = useMemo((): string => {
    if (!dataset || totalSteps === 0) return "";
    const ref = dataset.bodies.find((b) => b.points.length > 0);
    if (!ref) return "";
    const idx = Math.min(Math.floor(dayIndex), ref.points.length - 1);
    return ref.points[idx].date;
  }, [dataset, dayIndex, totalSteps]);

  // ── Progress ────────────────────────────────────────────────────────────────
  const progress = useMemo(
    () => (totalSteps > 1 ? (dayIndex / (totalSteps - 1)) * 100 : 0),
    [dayIndex, totalSteps],
  );

  // ── Controls ─────────────────────────────────────────────────────────────────
  const play  = useCallback(() => setIsPlaying(true),  []);
  const pause = useCallback(() => setIsPlaying(false), []);

  const reset = useCallback(() => {
    setIsPlaying(false);
    dayRef.current = 0;
    setDayIndex(0);
  }, []);

  const setSpeed = useCallback((s: number) => {
    speedRef.current = s;
    setSpeedState(s);
  }, []);

  const seekToDate = useCallback(
    (iso: string) => {
      if (!dataset) return;
      const ref = dataset.bodies.find((b) => b.points.length > 0);
      if (!ref) return;
      const idx     = ref.points.findIndex((p) => p.date >= iso);
      const clamped = idx === -1 ? ref.points.length - 1 : idx;
      dayRef.current = clamped;
      setDayIndex(clamped);
    },
    [dataset],
  );

  const seekToProgress = useCallback(
    (pct: number) => {
      if (totalSteps === 0) return;
      const next = Math.max(0, Math.min(1, pct / 100)) * (totalSteps - 1);
      dayRef.current = next;
      setDayIndex(next);
    },
    [totalSteps],
  );

  return {
    currentDate,
    currentPositions,
    isPlaying,
    speed,
    progress,
    play,
    pause,
    reset,
    setSpeed,
    seekToDate,
    seekToProgress,
  };
}
