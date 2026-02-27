"use client";

import { useState } from "react";
import { useSpaceData, BODIES } from "@/hooks/useSpaceData";
import type { SpaceDataset, BodyData } from "@/types/space";

// ─── Date helpers ──────────────────────────────────────────────────────────────
// Horizons ephemeris for Voyager 1 starts 1977-09-06 (launched Sep 5 at 12:56 UTC;
// midnight TDB on Sep 5 precedes the trajectory file start).
const VOYAGER1_LAUNCH = "1977-09-06";

function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

function formatDateRU(iso: string): string {
  if (!iso) return "—";
  const months = [
    "января","февраля","марта","апреля","мая","июня",
    "июля","августа","сентября","октября","ноября","декабря",
  ];
  const [y, m, d] = iso.split("-");
  return `${parseInt(d, 10)} ${months[parseInt(m, 10) - 1]} ${y}`;
}

function yearsBetween(a: string, b: string): number {
  return (new Date(b).getTime() - new Date(a).getTime()) / (365.25 * 86_400_000);
}

function msToSeconds(ms: number): string {
  return (ms / 1_000).toFixed(1) + "с";
}

// ─── Status indicator ──────────────────────────────────────────────────────────
function StatusIcon({ status }: { status: BodyData["status"] }) {
  if (status === "done")    return <span className="text-emerald-400">✓</span>;
  if (status === "loading") return <span className="text-amber-400 animate-pulse">⟳</span>;
  if (status === "error")   return <span className="text-red-400">✗</span>;
  return <span className="text-neutral-600">○</span>;
}

// ─── Single body row ───────────────────────────────────────────────────────────
function BodyRow({
  body,
  onRetry,
}: {
  body:    BodyData;
  onRetry: (id: string) => void;
}) {
  const color =
    body.status === "done"    ? "text-emerald-400" :
    body.status === "loading" ? "text-amber-400"   :
    body.status === "error"   ? "text-red-400"      :
                                "text-neutral-500";

  return (
    <div className={`flex items-center gap-2 font-mono text-xs ${color}`}>
      <StatusIcon status={body.status} />
      <span className="w-24 shrink-0">{body.label}</span>
      <span className="flex-1">
        {body.status === "done" && (
          <>
            <span className="text-neutral-400">{body.pointsCount.toLocaleString("ru-RU")} точек</span>
            <span className="text-neutral-600 ml-3">за {msToSeconds(body.loadTimeMs)}</span>
          </>
        )}
        {body.status === "loading" && (
          <span className="text-amber-400 animate-pulse">запрос отправлен...</span>
        )}
        {body.status === "waiting" && (
          <span className="text-neutral-600">ожидание</span>
        )}
        {body.status === "error" && (
          <span className="text-red-400">{body.error ?? "ошибка"}</span>
        )}
      </span>
      {body.status === "error" && (
        <button
          onClick={() => onRetry(body.body)}
          className="ml-1 px-2 py-0.5 rounded border border-red-500/40 text-red-400 hover:bg-red-500/10 transition-colors text-[10px]"
        >
          Повторить
        </button>
      )}
    </div>
  );
}

// ─── Progress bar ──────────────────────────────────────────────────────────────
function ProgressBar({ done, total }: { done: number; total: number }) {
  const pct    = total === 0 ? 0 : Math.round((done / total) * 100);
  const filled = Math.round(pct / 5); // 20 blocks
  const empty  = 20 - filled;
  return (
    <div className="font-mono text-xs text-neutral-400 flex items-center gap-3 mt-1">
      <span className="text-emerald-500">{"█".repeat(filled)}</span>
      <span className="text-neutral-700">{"░".repeat(empty)}</span>
      <span>{done} из {total}</span>
    </div>
  );
}

// ─── Terminal window ───────────────────────────────────────────────────────────
function Terminal({
  bodies,
  startDate,
  endDate,
  isLoading,
  isComplete,
  dataset,
  onRetry,
  onPlay,
}: {
  bodies:     BodyData[];
  startDate:  string;
  endDate:    string;
  isLoading:  boolean;
  isComplete: boolean;
  dataset:    SpaceDataset | null;
  onRetry:    (id: string) => void;
  onPlay:     () => void;
}) {
  const doneCount  = bodies.filter((b) => b.status === "done").length;
  const errorCount = bodies.filter((b) => b.status === "error").length;
  const totalCount = BODIES.length;

  return (
    <div
      className="rounded-xl border border-neutral-700 overflow-hidden"
      style={{ background: "#0a0a0a", fontFamily: "monospace" }}
    >
      {/* ── Header ── */}
      <div className="border-b border-neutral-800 px-4 py-2 flex items-center gap-2">
        <span className="w-3 h-3 rounded-full bg-red-500/60" />
        <span className="w-3 h-3 rounded-full bg-amber-500/60" />
        <span className="w-3 h-3 rounded-full bg-emerald-500/60" />
        <span className="ml-2 text-xs text-neutral-500 font-mono">NASA JPL Horizons API</span>
      </div>

      <div className="px-4 py-4 space-y-1">
        {/* Date range */}
        <p className="text-xs text-neutral-500 font-mono mb-3">
          <span className="text-blue-400">🛸</span>{" "}
          Загрузка: {formatDateRU(startDate)} — {formatDateRU(endDate)}
        </p>

        {/* Body rows */}
        <div className="space-y-1.5">
          {bodies.map((b) => (
            <BodyRow key={b.body} body={b} onRetry={onRetry} />
          ))}
        </div>

        {/* Progress */}
        {(isLoading || isComplete) && (
          <div className="mt-3">
            <ProgressBar done={doneCount} total={totalCount} />
          </div>
        )}

        {/* Footer */}
        <p className="text-[10px] text-neutral-700 font-mono mt-2">
          ssd.jpl.nasa.gov · Данные не кэшируются
        </p>

        {/* Summary + Play button */}
        {isComplete && dataset && (
          <div className="mt-4 pt-4 border-t border-neutral-800 space-y-3">
            <p className="text-xs text-neutral-400 font-mono">
              Всего:{" "}
              <span className="text-emerald-400">
                {dataset.totalPoints.toLocaleString("ru-RU")} точек
              </span>
              {" · "}
              Время загрузки:{" "}
              <span className="text-blue-400">{msToSeconds(dataset.totalLoadTimeMs)}</span>
            </p>

            {errorCount > 0 && (
              <p className="text-xs text-amber-400 font-mono">
                ⚠ Загружено {doneCount} из {totalCount} тел
              </p>
            )}

            <button
              onClick={onPlay}
              className="
                w-full py-3 rounded-lg font-semibold text-sm text-white
                bg-emerald-600 hover:bg-emerald-500 transition-colors
                animate-pulse hover:animate-none
              "
            >
              ▶ ЗАПУСТИТЬ АНИМАЦИЮ
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Date input form ───────────────────────────────────────────────────────────
function DateForm({ onSubmit }: { onSubmit: (start: string, end: string) => void }) {
  const [startDate, setStartDate] = useState(VOYAGER1_LAUNCH);
  const [endDate,   setEndDate]   = useState(todayISO());
  const [error,     setError]     = useState("");

  const validate = (): string | null => {
    if (startDate < VOYAGER1_LAUNCH)
      return `Начальная дата не может быть раньше запуска Voyager 1 (${VOYAGER1_LAUNCH})`;
    if (endDate > todayISO())
      return "Конечная дата не может быть позже сегодняшней";
    if (startDate >= endDate)
      return "Начальная дата должна быть раньше конечной";
    if (yearsBetween(startDate, endDate) > 50)
      return "Диапазон не может превышать 50 лет";
    return null;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const err = validate();
    if (err) { setError(err); return; }
    setError("");
    onSubmit(startDate, endDate);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <h3 className="text-sm font-semibold text-white/80">
        Загрузка данных из NASA JPL Horizons
      </h3>

      <div className="grid grid-cols-2 gap-3">
        <label className="space-y-1">
          <span className="text-xs text-white/50">Начальная дата</span>
          <input
            type="date"
            value={startDate}
            min={VOYAGER1_LAUNCH}
            max={endDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="w-full rounded-md border border-white/15 bg-white/5 px-3 py-1.5 text-sm text-white/80 focus:outline-none focus:border-blue-500/60"
          />
        </label>
        <label className="space-y-1">
          <span className="text-xs text-white/50">Конечная дата</span>
          <input
            type="date"
            value={endDate}
            min={startDate}
            max={todayISO()}
            onChange={(e) => setEndDate(e.target.value)}
            className="w-full rounded-md border border-white/15 bg-white/5 px-3 py-1.5 text-sm text-white/80 focus:outline-none focus:border-blue-500/60"
          />
        </label>
      </div>

      {error && (
        <p className="text-xs text-red-400">{error}</p>
      )}

      <button
        type="submit"
        className="w-full py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-sm font-semibold text-white transition-colors"
      >
        Загрузить данные из NASA
      </button>
    </form>
  );
}

// ─── Main component ────────────────────────────────────────────────────────────
export interface DataLoaderProps {
  onComplete: (data: SpaceDataset) => void;
}

type LoaderPhase = "idle" | "loading" | "complete";

export function DataLoader({ onComplete }: DataLoaderProps) {
  const [phase,     setPhase]     = useState<LoaderPhase>("idle");
  const [startDate, setStartDate] = useState("");
  const [endDate,   setEndDate]   = useState("");
  const [dataset,   setDataset]   = useState<SpaceDataset | null>(null);

  // useSpaceData no longer needs dates as hook params — they're passed per-call
  const { bodies, isLoading, startLoad, retryBody } = useSpaceData(
    (data) => {
      setDataset(data);
      setPhase("complete");
    },
  );

  const handleFormSubmit = (start: string, end: string) => {
    setStartDate(start);
    setEndDate(end);
    setPhase("loading");
    // Call startLoad immediately with fresh values from the form —
    // no setTimeout, no stale-closure risk.
    startLoad(start, end);
  };

  const handleRetry = (bodyId: string) => {
    retryBody(bodyId, startDate, endDate);
  };

  const handlePlay = () => {
    if (dataset) onComplete(dataset);
  };

  return (
    <div className="space-y-4">
      {phase === "idle" && (
        <DateForm onSubmit={handleFormSubmit} />
      )}

      {(phase === "loading" || phase === "complete") && (
        <Terminal
          bodies={bodies}
          startDate={startDate}
          endDate={endDate}
          isLoading={isLoading}
          isComplete={phase === "complete"}
          dataset={dataset}
          onRetry={handleRetry}
          onPlay={handlePlay}
        />
      )}
    </div>
  );
}
