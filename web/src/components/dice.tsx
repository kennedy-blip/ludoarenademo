"use client";

import { cn } from "@/lib/cn";

const PIPS: Record<number, [number, number][]> = {
  1: [[1, 1]],
  2: [[0, 0], [2, 2]],
  3: [[0, 0], [1, 1], [2, 2]],
  4: [[0, 0], [0, 2], [2, 0], [2, 2]],
  5: [[0, 0], [0, 2], [1, 1], [2, 0], [2, 2]],
  6: [[0, 0], [0, 2], [1, 0], [1, 2], [2, 0], [2, 2]],
};

export function Dice({
  value,
  rolling,
  onRoll,
  disabled,
  label,
}: {
  value: number | null;
  rolling?: boolean;
  onRoll: () => void;
  disabled?: boolean;
  label?: string;
}) {
  const face = value ?? 1;
  return (
    <div className="flex flex-col items-center gap-3">
      <button
        type="button"
        onClick={onRoll}
        disabled={disabled}
        aria-label={label ?? "Roll the dice"}
        className={cn(
          "group relative grid h-24 w-24 place-items-center rounded-3xl border-2 border-white/25 bg-gradient-to-br from-white to-slate-200 shadow-[0_18px_40px_-16px_rgba(0,0,0,0.9)] transition",
          !disabled && "hover:-translate-y-0.5 active:translate-y-0",
          disabled && "cursor-not-allowed opacity-60",
          rolling && "animate-tumble",
        )}
      >
        <div className="grid h-14 w-14 grid-cols-3 grid-rows-3 gap-1">
          {Array.from({ length: 9 }).map((_, i) => {
            const r = Math.floor(i / 3);
            const c = i % 3;
            const on = PIPS[face].some(([pr, pc]) => pr === r && pc === c);
            return (
              <span
                key={i}
                className={cn(
                  "rounded-full transition",
                  on ? "bg-slate-900 shadow-inner" : "bg-transparent",
                )}
              />
            );
          })}
        </div>
        {!disabled && (
          <span className="absolute -bottom-2 rounded-full bg-violet-600 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white shadow">
            tap
          </span>
        )}
      </button>
      <span className="text-xs text-white/50">
        {value ? `Rolled ${value}` : rolling ? "Rolling…" : "Your move"}
      </span>
    </div>
  );
}
