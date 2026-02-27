"use client";

import { useRef } from "react";
import type { AnimationState } from "@/hooks/useAnimation";

// ─── Speed options ─────────────────────────────────────────────────────────────
const SPEED_OPTIONS: Array<{ value: number; label: string }> = [
  { value: 30,   label: "30 дн/с"   },
  { value: 90,   label: "90 дн/с"   },
  { value: 365,  label: "365 дн/с"  },
  { value: 1825, label: "1825 дн/с" },
];

// ─── Date formatting ───────────────────────────────────────────────────────────
function formatDateRU(iso: string): string {
  if (!iso) return "—";
  const months = [
    "января","февраля","марта","апреля","мая","июня",
    "июля","августа","сентября","октября","ноября","декабря",
  ];
  const [y, m, d] = iso.split("-");
  return `${parseInt(d, 10)} ${months[parseInt(m, 10) - 1]} ${y}`;
}

// ─── Icon button ───────────────────────────────────────────────────────────────
function CtrlBtn({
  label,
  title,
  onClick,
  dim = false,
}: {
  label:   string;
  title:   string;
  onClick: () => void;
  dim?:    boolean;
}) {
  return (
    <button
      title={title}
      onClick={onClick}
      className={[
        "px-3 py-1.5 rounded-md text-xs font-medium transition-colors border",
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
  anim:    AnimationState;
  disabled?: boolean;
}

export function AnimationControls({ anim, disabled = false }: AnimationControlsProps) {
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

      {/* ── Row 4: current date ───────────────────────────────────────────── */}
      <div className="flex items-center justify-between">
        <span className="text-xs text-white/40">Дата:</span>
        <span className="text-sm font-semibold text-blue-300 tabular-nums">
          {formatDateRU(currentDate)}
        </span>
      </div>
    </div>
  );
}
