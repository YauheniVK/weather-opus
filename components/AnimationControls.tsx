"use client";

import { useRef } from "react";
import type { AnimationState } from "@/hooks/useAnimation";

// ─── Speed options ─────────────────────────────────────────────────────────────
const SPEED_OPTIONS: Array<{ value: number; label: string }> = [
  { value: 10,   label: "10 дн/с"   },
  { value: 30,   label: "30 дн/с"   },
  { value: 90,   label: "90 дн/с"   },
  { value: 365,  label: "365 дн/с"  },
  { value: 1825, label: "1825 дн/с" },
];

// ─── Date formatting ───────────────────────────────────────────────────────────
const MONTHS_RU = [
  "января","февраля","марта","апреля","мая","июня",
  "июля","августа","сентября","октября","ноября","декабря",
];

function formatDateRU(iso: string): string {
  if (!iso) return "—";
  const [y, m, d] = iso.split("-");
  return `${parseInt(d, 10)} ${MONTHS_RU[parseInt(m, 10) - 1]} ${y}`;
}

function getWeekNumber(iso: string): number {
  if (!iso) return 0;
  const d = new Date(iso);
  const start = new Date(d.getFullYear(), 0, 1);
  const diff = d.getTime() - start.getTime();
  return Math.floor(diff / (7 * 86400000)) + 1;
}

/** Returns { day, month, week, year } as fixed-width strings */
function parseDateParts(iso: string) {
  if (!iso) return { day: "—", month: "—", week: "—", year: "—" };
  const [y, m, d] = iso.split("-");
  return {
    day:   String(parseInt(d, 10)).padStart(2, "\u2007"),   // figure space pad
    month: MONTHS_RU[parseInt(m, 10) - 1],
    week:  String(getWeekNumber(iso)).padStart(2, "\u2007"),
    year:  y,
  };
}

function yearsLabel(n: number): string {
  const m10 = n % 10, m100 = n % 100;
  if (m100 >= 11 && m100 <= 14) return "лет";
  if (m10 === 1) return "год";
  if (m10 >= 2 && m10 <= 4) return "года";
  return "лет";
}

function formatElapsed(start: string, current: string): string {
  if (!start || !current) return "";
  const s = new Date(start);
  const c = new Date(current);
  let years  = c.getFullYear() - s.getFullYear();
  let months = c.getMonth()    - s.getMonth();
  if (months < 0) { years--; months += 12; }
  if (years === 0 && months === 0) return "старт";
  const parts: string[] = [];
  if (years  > 0) parts.push(`${years} ${yearsLabel(years)}`);
  if (months > 0) parts.push(`${months} мес.`);
  return parts.join(" ");
}

// ─── Icon button ───────────────────────────────────────────────────────────────
function CtrlBtn({
  label,
  title,
  onClick,
  dim = false,
  small = false,
}: {
  label:   string;
  title:   string;
  onClick: () => void;
  dim?:    boolean;
  small?:  boolean;
}) {
  return (
    <button
      title={title}
      onClick={onClick}
      className={[
        "rounded-md font-medium transition-colors border",
        small ? "px-2 py-1 text-[10px]" : "px-3 py-1.5 text-xs",
        dim
          ? "border-white/10 text-white/40 hover:text-white/60 hover:border-white/20"
          : "border-blue-500/30 text-blue-300 bg-blue-500/10 hover:bg-blue-500/20",
      ].join(" ")}
    >
      {label}
    </button>
  );
}

// ─── Component ────────────────────────────────────────────────────────────────
export interface AnimationControlsProps {
  anim:       AnimationState;
  startDate?: string;
  endDate?:   string;
  disabled?:  boolean;
  compact?:   boolean;
}

export function AnimationControls({ anim, startDate, endDate, disabled = false, compact = false }: AnimationControlsProps) {
  const {
    currentDate, isPlaying, speed, progress,
    play, pause, reset, setSpeed, seekToProgress,
  } = anim;

  // Scrubbing: pause on drag start, resume on release if was playing
  const wasPlayingRef = useRef(false);

  const handleSliderDown = () => {
    wasPlayingRef.current = isPlaying;
    if (isPlaying) pause();
  };

  const handleSliderUp = () => {
    if (wasPlayingRef.current) play();
  };

  const handleSlider = (e: React.ChangeEvent<HTMLInputElement>) => {
    seekToProgress(Number(e.target.value));
  };

  if (compact) {
    return (
      <div
        className={[
          "rounded-xl border border-white/10 bg-white/5 px-4 py-3 flex flex-col gap-3",
          disabled ? "opacity-40 pointer-events-none select-none" : "",
        ].join(" ")}
      >
        {/* Transport buttons — top */}
        <div className="flex items-center justify-center gap-2">
          <button
            title="В начало"
            onClick={reset}
            className={[
              "px-4 py-2.5 rounded-lg text-xs font-medium transition-colors border",
              !isPlaying && progress === 0
                ? "border-white/10 text-white/40 hover:text-white/60 hover:border-white/20"
                : "border-blue-500/30 text-blue-300 bg-blue-500/10 hover:bg-blue-500/20",
            ].join(" ")}
          >
            ◀◀ В начало
          </button>
          <button
            title={isPlaying ? "Пауза" : "Запустить"}
            onClick={isPlaying ? pause : play}
            className="px-5 py-2.5 rounded-lg text-xs font-medium transition-colors border border-blue-500/30 text-blue-300 bg-blue-500/10 hover:bg-blue-500/20"
          >
            {isPlaying ? "⏸ Пауза" : "▶ Play"}
          </button>
          <button
            title="В конец"
            onClick={() => seekToProgress(100)}
            className={[
              "px-4 py-2.5 rounded-lg text-xs font-medium transition-colors border",
              progress >= 100
                ? "border-white/10 text-white/40 hover:text-white/60 hover:border-white/20"
                : "border-blue-500/30 text-blue-300 bg-blue-500/10 hover:bg-blue-500/20",
            ].join(" ")}
          >
            В конец ▶▶
          </button>
        </div>

        {/* Dates + slider */}
        <div className="flex flex-col gap-1">
          <div className="flex items-center justify-between text-[10px] font-mono tabular-nums">
            <span className="text-white/40">{startDate ?? "—"}</span>
            <span className="text-sm font-bold text-emerald-400">{currentDate ? currentDate.replace(/-/g, ":") : "—"}</span>
            <span className="text-white/40">{endDate ?? "—"}</span>
          </div>
          <input
            type="range"
            min={0}
            max={100}
            step={0.01}
            value={progress}
            onChange={handleSlider}
            onPointerDown={handleSliderDown}
            onPointerUp={handleSliderUp}
            className="w-full h-1.5 accent-blue-500 cursor-pointer"
          />
        </div>

        {/* Speed */}
        <div>
          <p className="text-xs text-white/40 mb-1.5">Скорость:</p>
          <div className="flex items-center gap-1.5">
            {SPEED_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                onClick={() => setSpeed(opt.value)}
                className={[
                  "px-2 py-1 rounded-md text-xs font-medium transition-colors border",
                  speed === opt.value
                    ? "border-blue-500/50 bg-blue-500/15 text-blue-300"
                    : "border-white/10 text-white/40 hover:text-white/60",
                ].join(" ")}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className={[
        "rounded-xl border border-white/10 bg-white/5 px-4 py-3 space-y-3",
        disabled ? "opacity-40 pointer-events-none select-none" : "",
      ].join(" ")}
    >
      {/* ── Row 1: transport buttons ──────────────────────────────────────── */}
      <div className="flex items-center gap-2 flex-wrap">
        <CtrlBtn
          label="◀◀ В начало"
          title="Перейти в начало"
          onClick={reset}
          dim={!isPlaying && progress === 0}
        />

        {isPlaying ? (
          <CtrlBtn label="⏸ Пауза" title="Пауза" onClick={pause} />
        ) : (
          <CtrlBtn label="▶ Play" title="Запустить" onClick={play} />
        )}

        <CtrlBtn
          label="▶▶ В конец"
          title="Перейти в конец"
          onClick={() => seekToProgress(100)}
          dim={progress >= 100}
        />
      </div>

      {/* ── Row 2: speed buttons ──────────────────────────────────────────── */}
      <div className="flex items-center gap-1.5 flex-wrap">
        <span className="text-xs text-white/40 mr-1">Скорость:</span>
        {SPEED_OPTIONS.map((opt) => (
          <button
            key={opt.value}
            onClick={() => setSpeed(opt.value)}
            className={[
              "px-2.5 py-1 rounded-md text-xs font-medium transition-colors border",
              speed === opt.value
                ? "border-blue-500/50 bg-blue-500/15 text-blue-300"
                : "border-white/10 text-white/40 hover:text-white/60",
            ].join(" ")}
          >
            {opt.label}
          </button>
        ))}
      </div>

      {/* ── Row 3: slider ─────────────────────────────────────────────────── */}
      <div className="space-y-1">
        <input
          type="range"
          min={0}
          max={100}
          step={0.01}
          value={progress}
          onChange={handleSlider}
          onPointerDown={handleSliderDown}
          onPointerUp={handleSliderUp}
          className="w-full h-1.5 accent-blue-500 cursor-pointer"
        />
      </div>

      {/* ── Row 4: current date + elapsed ─────────────────────────────────── */}
      <div className="flex items-center justify-between">
        <span className="text-xs text-white/40">Дата:</span>
        <div className="flex items-center gap-2">
          {startDate && (
            <span className="text-xs text-white/35 tabular-nums">
              {formatElapsed(startDate, currentDate)}
            </span>
          )}
          <span className="text-sm font-semibold text-blue-300 tabular-nums">
            {formatDateRU(currentDate)}
          </span>
        </div>
      </div>
    </div>
  );
}
