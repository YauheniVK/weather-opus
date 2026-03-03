"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useSpaceData, BODIES } from "@/hooks/useSpaceData";
import type { SpaceDataset, BodyData } from "@/types/space";

// ─── Date helpers ──────────────────────────────────────────────────────────────

function todayISO(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
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

// ─── Popup date picker (year / month / day with hold-to-repeat) ──────────────
const MONTH_LABELS_RU_DL = [
  "Январь","Февраль","Март","Апрель","Май","Июнь",
  "Июль","Август","Сентябрь","Октябрь","Ноябрь","Декабрь",
];

function PopupDatePicker({
  value,
  onChange,
  onClose,
  align = "left",
}: {
  value: string;
  onChange: (iso: string) => void;
  onClose: () => void;
  align?: "left" | "right";
}) {
  const [y, m, d] = value.split("-").map(Number);
  const daysInMonth = new Date(y, m, 0).getDate();

  const valRef = useRef({ y, m, d });
  valRef.current = { y, m, d };
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  const emitFrom = (ny: number, nm: number, nd: number) => {
    const maxD = new Date(ny, nm, 0).getDate();
    const fd   = Math.min(nd, maxD);
    onChangeRef.current(`${ny}-${String(nm).padStart(2, "0")}-${String(fd).padStart(2, "0")}`);
  };

  type StepFn = (v: { y: number; m: number; d: number }) => void;
  const stepFnRef = useRef<StepFn | null>(null);
  const timerRef  = useRef<ReturnType<typeof setTimeout> | null>(null);
  const ivRef     = useRef<ReturnType<typeof setInterval> | null>(null);

  const clearRepeat = useCallback(() => {
    if (timerRef.current) { clearTimeout(timerRef.current);  timerRef.current = null; }
    if (ivRef.current)    { clearInterval(ivRef.current);    ivRef.current = null; }
    stepFnRef.current = null;
  }, []);

  const holdProps = (stepFn: StepFn) => ({
    onPointerDown: () => {
      stepFn(valRef.current);
      stepFnRef.current = stepFn;
      clearRepeat();
      stepFnRef.current = stepFn;
      timerRef.current = setTimeout(() => {
        ivRef.current = setInterval(() => { stepFnRef.current?.(valRef.current); }, 120);
      }, 400);
    },
    onPointerUp:     clearRepeat,
    onPointerLeave:  clearRepeat,
    onPointerCancel: clearRepeat,
  });

  useEffect(() => clearRepeat, [clearRepeat]);

  // Close on click outside
  const popupRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (popupRef.current && !popupRef.current.contains(e.target as Node)) onClose();
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [onClose]);

  // Close after cursor leaves for 3s
  const leaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const handleMouseEnter = () => { if (leaveTimerRef.current) { clearTimeout(leaveTimerRef.current); leaveTimerRef.current = null; } };
  const handleMouseLeave = () => { leaveTimerRef.current = setTimeout(onClose, 3000); };
  useEffect(() => () => { if (leaveTimerRef.current) clearTimeout(leaveTimerRef.current); }, []);

  const yearDec:  StepFn = (v) => emitFrom(v.y - 1, v.m, v.d);
  const yearInc:  StepFn = (v) => emitFrom(v.y + 1, v.m, v.d);
  const monthDec: StepFn = (v) => emitFrom(v.m === 1 ? v.y - 1 : v.y, v.m === 1 ? 12 : v.m - 1, v.d);
  const monthInc: StepFn = (v) => emitFrom(v.m === 12 ? v.y + 1 : v.y, v.m === 12 ? 1 : v.m + 1, v.d);
  const dayDec: StepFn = (v) => {
    if (v.d <= 1) {
      const pm = v.m === 1 ? 12 : v.m - 1;
      const py = v.m === 1 ? v.y - 1 : v.y;
      emitFrom(py, pm, new Date(py, pm, 0).getDate());
    } else { emitFrom(v.y, v.m, v.d - 1); }
  };
  const dayInc: StepFn = (v) => {
    const max = new Date(v.y, v.m, 0).getDate();
    if (v.d >= max) {
      const nm = v.m === 12 ? 1 : v.m + 1;
      const ny = v.m === 12 ? v.y + 1 : v.y;
      emitFrom(ny, nm, 1);
    } else { emitFrom(v.y, v.m, v.d + 1); }
  };

  const inputCls =
    "w-full rounded-md border border-white/15 bg-white/5 px-2 py-1 text-xs text-white/80 text-center focus:outline-none focus:border-blue-500/50";
  const arrowCls = "text-white/30 hover:text-white/70 text-xs px-1.5 shrink-0";
  const lblCls   = "text-[10px] text-white/30 w-10 shrink-0";

  return (
    <div
      ref={popupRef}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      className={`absolute top-full ${align === "right" ? "right-0" : "left-0"} mt-1 z-30 rounded-lg border border-white/15 bg-black/95 backdrop-blur-md px-3 py-2.5 shadow-xl select-none space-y-1.5`}
      style={{ width: 220 }}
    >
      {/* Year */}
      <div className="flex items-center gap-1">
        <span className={lblCls}>Год</span>
        <button type="button" {...holdProps(yearDec)} className={arrowCls}>◀</button>
        <input type="number" value={y}
          onChange={(e) => { const v = parseInt(e.target.value); if (v) emitFrom(v, m, d); }}
          className={inputCls} style={{ minWidth: 0 }}
        />
        <button type="button" {...holdProps(yearInc)} className={arrowCls}>▶</button>
      </div>
      {/* Month */}
      <div className="flex items-center gap-1">
        <span className={lblCls}>Месяц</span>
        <button type="button" {...holdProps(monthDec)} className={arrowCls}>◀</button>
        <select value={m} onChange={(e) => emitFrom(y, parseInt(e.target.value), d)}
          className={inputCls + " appearance-none cursor-pointer"} style={{ minWidth: 0 }}
        >
          {MONTH_LABELS_RU_DL.map((l, i) => (
            <option key={i} value={i + 1} className="bg-black text-white">{l}</option>
          ))}
        </select>
        <button type="button" {...holdProps(monthInc)} className={arrowCls}>▶</button>
      </div>
      {/* Day */}
      <div className="flex items-center gap-1">
        <span className={lblCls}>День</span>
        <button type="button" {...holdProps(dayDec)} className={arrowCls}>◀</button>
        <input type="number" min={1} max={daysInMonth} value={d}
          onChange={(e) => { const v = parseInt(e.target.value); if (v >= 1 && v <= daysInMonth) emitFrom(y, m, v); }}
          className={inputCls} style={{ minWidth: 0 }}
        />
        <button type="button" {...holdProps(dayInc)} className={arrowCls}>▶</button>
      </div>
      {/* Footer */}
      <div className="pt-0.5 flex items-center justify-between">
        <button
          type="button"
          onClick={() => {
            const now = new Date();
            emitFrom(now.getFullYear(), now.getMonth() + 1, now.getDate());
          }}
          className="text-[10px] text-blue-400/70 hover:text-blue-300 transition-colors"
        >
          Сегодня
        </button>
        <button
          type="button"
          onClick={onClose}
          className="flex items-center justify-center w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30 transition-colors text-xs"
          title="Готово"
        >
          ✓
        </button>
      </div>
    </div>
  );
}

// ─── Probe mission presets ───────────────────────────────────────────────────
const PROBE_PRESETS: Array<{
  name:  string;
  start: string;
  end:   string;
  note:  string;
  color: string;
}> = [
  { name: "Pioneer 10",         start: "1972-03-03", end: "2003-01-23", note: "связь потеряна",       color: "#FFB347" },
  { name: "Pioneer 11",         start: "1973-04-06", end: "1995-11-30", note: "связь потеряна",       color: "#FFB347" },
  { name: "Voyager 2",          start: "1977-08-20", end: todayISO(),   note: "активен",              color: "#FF6B6B" },
  { name: "Voyager 1",          start: "1977-09-05", end: todayISO(),   note: "активен",              color: "#FF6B6B" },
  { name: "Cassini",            start: "1997-10-15", end: "2017-09-15", note: "вход в атм. Сатурна",  color: "#9B7DFF" },
  { name: "MESSENGER",          start: "2004-08-03", end: "2015-05-01", note: "падение на Меркурий",  color: "#00CED1" },
  { name: "New Horizons",       start: "2006-01-19", end: todayISO(),   note: "активен",              color: "#7BE87B" },
  { name: "Parker Solar Probe", start: "2018-08-12", end: todayISO(),   note: "активен",              color: "#FFD700" },
];

function ProbePresetsPopup({
  onSelect,
  onClose,
}: {
  onSelect: (start: string, end: string) => void;
  onClose:  () => void;
}) {
  const popupRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (popupRef.current && !popupRef.current.contains(e.target as Node)) onClose();
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [onClose]);

  return (
    <div
      ref={popupRef}
      className="absolute top-full right-0 mt-1 z-30 rounded-lg border border-white/15 bg-black/95 backdrop-blur-md px-2 py-2 shadow-xl select-none"
      style={{ width: 300 }}
    >
      <p className="text-[10px] uppercase tracking-widest text-white/30 mb-1.5 px-1">Миссии зондов</p>
      {PROBE_PRESETS.map((p) => {
        const isActive = p.end === todayISO();
        return (
          <button
            key={p.name}
            type="button"
            onClick={() => { onSelect(p.start, p.end); onClose(); }}
            className="w-full flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-white/5 transition-colors text-left"
          >
            <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: p.color }} />
            <span className="flex-1 text-xs text-white/80 whitespace-nowrap">{p.name}</span>
            <span className="text-xs text-white/40 font-mono whitespace-nowrap">
              {p.start.replace(/-/g, ".")} – {p.end.replace(/-/g, ".")}
            </span>
          </button>
        );
      })}
      <div className="border-t border-white/10 mt-1.5 pt-1.5 px-1">
        <button
          type="button"
          onClick={() => { onSelect("1972-03-03", todayISO()); onClose(); }}
          className="w-full text-left text-[10px] text-blue-400/70 hover:text-blue-300 transition-colors py-0.5"
        >
          Все зонды (1972 – сегодня)
        </button>
      </div>
    </div>
  );
}

// ─── Date input form ───────────────────────────────────────────────────────────
function DateForm({ onSubmit }: { onSubmit: (start: string, end: string) => void }) {
  const [startDate, setStartDate] = useState("1977-08-21");
  const [endDate,   setEndDate]   = useState(todayISO());
  const [error,     setError]     = useState("");
  const [openPicker, setOpenPicker] = useState<"start" | "end" | null>(null);
  const [showProbes, setShowProbes] = useState(false);

  const validate = (): string | null => {
    if (endDate > todayISO())
      return "Конечная дата не может быть позже сегодняшней";
    if (startDate >= endDate)
      return "Начальная дата должна быть раньше конечной";
    if (yearsBetween(startDate, endDate) > 100)
      return "Диапазон не может превышать 100 лет";
    return null;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const err = validate();
    if (err) { setError(err); return; }
    setError("");
    onSubmit(startDate, endDate);
  };

  const handlePresetSelect = (start: string, end: string) => {
    setStartDate(start);
    setEndDate(end);
    setError("");
  };

  const dateBtnCls = (active: boolean) => [
    "w-full rounded-md border px-3 py-1.5 text-sm text-left transition-colors",
    active
      ? "border-blue-500/40 bg-blue-500/10 text-blue-300"
      : "border-white/15 bg-white/5 text-white/80 hover:border-white/25",
  ].join(" ");

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-white/80">
          Загрузка данных из NASA JPL Horizons
        </h3>
        <div className="relative">
          <button
            type="button"
            onClick={() => setShowProbes(!showProbes)}
            className={[
              "px-2 py-1 rounded-md text-[10px] font-medium transition-colors border",
              showProbes
                ? "border-blue-500/40 bg-blue-500/10 text-blue-300"
                : "border-white/15 text-white/40 hover:text-white/70 hover:border-white/25",
            ].join(" ")}
          >
            Зонды
          </button>
          {showProbes && (
            <ProbePresetsPopup
              onSelect={handlePresetSelect}
              onClose={() => setShowProbes(false)}
            />
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {/* Start date */}
        <div className="space-y-1">
          <span className="text-xs text-white/50">Начальная дата</span>
          <div className="relative">
            <button
              type="button"
              onClick={() => setOpenPicker(openPicker === "start" ? null : "start")}
              className={dateBtnCls(openPicker === "start")}
            >
              {formatDateRU(startDate)}
            </button>
            {openPicker === "start" && (
              <PopupDatePicker value={startDate} onChange={setStartDate} onClose={() => setOpenPicker(null)} />
            )}
          </div>
        </div>
        {/* End date */}
        <div className="space-y-1">
          <span className="text-xs text-white/50">Конечная дата</span>
          <div className="relative">
            <button
              type="button"
              onClick={() => setOpenPicker(openPicker === "end" ? null : "end")}
              className={dateBtnCls(openPicker === "end")}
            >
              {formatDateRU(endDate)}
            </button>
            {openPicker === "end" && (
              <PopupDatePicker value={endDate} onChange={setEndDate} onClose={() => setOpenPicker(null)} align="right" />
            )}
          </div>
        </div>
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
