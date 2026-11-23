import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

export function Card({
  children,
  className,
  glow = false,
}: {
  children: ReactNode;
  className?: string;
  glow?: boolean;
}) {
  return (
    <div
      className={cn(
        "glass rounded-3xl p-5 sm:p-6",
        glow && "shadow-[0_0_60px_-24px_rgba(124,77,255,0.9)]",
        className,
      )}
    >
      {children}
    </div>
  );
}

export function Stat({
  label,
  value,
  hint,
  accent,
}: {
  label: string;
  value: ReactNode;
  hint?: string;
  accent?: string;
}) {
  return (
    <div className="glass rounded-2xl px-4 py-3">
      <div className="text-[11px] uppercase tracking-[0.14em] text-white/45">{label}</div>
      <div className={cn("mt-1 text-xl font-bold tabular-nums", accent ?? "text-white")}>{value}</div>
      {hint && <div className="mt-0.5 text-[11px] text-white/40">{hint}</div>}
    </div>
  );
}

export function Pill({
  children,
  tone = "default",
  className,
}: {
  children: ReactNode;
  tone?: "default" | "gold" | "green" | "red" | "violet";
  className?: string;
}) {
  const tones: Record<string, string> = {
    default: "bg-white/10 text-white/75 border-white/15",
    gold: "bg-amber-400/15 text-amber-200 border-amber-300/30",
    green: "bg-emerald-400/15 text-emerald-200 border-emerald-300/30",
    red: "bg-rose-400/15 text-rose-200 border-rose-300/30",
    violet: "bg-violet-400/20 text-violet-100 border-violet-300/30",
  };
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-[11px] font-medium",
        tones[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}

export function Avatar({
  emoji,
  name,
  size = "md",
  ring,
}: {
  emoji: string;
  name?: string;
  size?: "sm" | "md" | "lg";
  ring?: string;
}) {
  const sizes = { sm: "h-8 w-8 text-base", md: "h-11 w-11 text-xl", lg: "h-16 w-16 text-3xl" };
  return (
    <div
      className={cn(
        "grid shrink-0 place-items-center rounded-2xl bg-white/10",
        sizes[size],
        ring && `ring-2 ${ring}`,
      )}
      aria-label={name}
    >
      <span aria-hidden>{emoji}</span>
    </div>
  );
}

export function Meter({ value, tone = "violet" }: { value: number; tone?: "violet" | "gold" | "green" }) {
  const tones = {
    violet: "from-violet-500 to-fuchsia-400",
    gold: "from-amber-400 to-orange-500",
    green: "from-emerald-400 to-teal-400",
  };
  return (
    <div className="h-2 w-full overflow-hidden rounded-full bg-white/10">
      <div
        className={cn("h-full rounded-full bg-gradient-to-r transition-[width] duration-500", tones[tone])}
        style={{ width: `${Math.max(0, Math.min(100, value * 100))}%` }}
      />
    </div>
  );
}

export function SectionTitle({
  eyebrow,
  title,
  action,
}: {
  eyebrow?: string;
  title: string;
  action?: ReactNode;
}) {
  return (
    <div className="mb-4 flex items-end justify-between gap-4">
      <div>
        {eyebrow && (
          <div className="text-[11px] uppercase tracking-[0.2em] text-violet-300/70">{eyebrow}</div>
        )}
        <h2 className="text-lg font-bold text-white sm:text-xl">{title}</h2>
      </div>
      {action}
    </div>
  );
}
