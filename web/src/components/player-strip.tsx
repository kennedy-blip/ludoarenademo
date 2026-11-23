"use client";

import { cn } from "@/lib/cn";
import type { GameState } from "@/lib/engine/types";
import { rankFor } from "@/lib/rating";
import { Avatar } from "./ui";

const RING: Record<string, string> = {
  red: "ring-rose-400",
  green: "ring-emerald-400",
  yellow: "ring-amber-300",
  blue: "ring-sky-400",
};

const DOT: Record<string, string> = {
  red: "bg-rose-400",
  green: "bg-emerald-400",
  yellow: "bg-amber-300",
  blue: "bg-sky-400",
};

export function PlayerStrip({
  game,
  profiles,
}: {
  game: GameState;
  profiles: Record<string, { avatar: string; rating: number }>;
}) {
  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
      {game.players.map((p, idx) => {
        const active = idx === game.turn && game.phase !== "finished";
        const home = p.tokens.filter((t) => t.progress >= 57).length;
        const profile = profiles[p.id];
        const rank = rankFor(profile?.rating ?? 1000);
        const progress = p.tokens.reduce((s, t) => s + Math.max(0, t.progress), 0) / (57 * 4);
        return (
          <div
            key={p.id}
            className={cn(
              "relative overflow-hidden rounded-2xl border px-3 py-2.5 transition",
              active
                ? "border-amber-300/60 bg-white/12 shadow-[0_0_30px_-12px_rgba(255,201,60,0.9)]"
                : "border-white/10 bg-white/[0.045]",
            )}
          >
            <div className="flex items-center gap-2">
              <Avatar
                emoji={profile?.avatar ?? (p.isBot ? "🤖" : "🙂")}
                size="sm"
                ring={active ? "ring-amber-300" : RING[p.color]}
              />
              <div className="min-w-0">
                <div className="flex items-center gap-1 truncate text-sm font-semibold text-white">
                  <span className={cn("h-1.5 w-1.5 shrink-0 rounded-full", DOT[p.color])} />
                  <span className="truncate">{p.name}</span>
                </div>
                <div className="truncate text-[11px] text-white/45">
                  {p.isBot ? "Bot" : "Human"} · {rank.emoji} {profile?.rating ?? 1000}
                </div>
              </div>
            </div>
            <div className="mt-2 flex items-center gap-2">
              <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-white/10">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-violet-400 to-fuchsia-400 transition-all duration-500"
                  style={{ width: `${Math.min(100, progress * 100)}%` }}
                />
              </div>
              <span className="text-[10px] tabular-nums text-white/50">{home}/4</span>
            </div>
            {active && (
              <span className="absolute right-2 top-2 h-1.5 w-1.5 animate-ping rounded-full bg-amber-300" />
            )}
          </div>
        );
      })}
    </div>
  );
}
