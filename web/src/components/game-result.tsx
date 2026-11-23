"use client";

import { useMemo, useState } from "react";
import { cn } from "@/lib/cn";
import { countCaptures } from "@/lib/economy";
import type { GameState } from "@/lib/engine/types";
import { rankFor } from "@/lib/rating";
import { Avatar, Pill } from "./ui";

export function GameResult({
  game,
  profiles,
  onPlayAgain,
  onHome,
  ratingDelta,
  prizeCents,
}: {
  game: GameState;
  profiles: Record<string, { username: string; avatar: string; rating: number }>;
  onPlayAgain: () => void;
  onHome: () => void;
  ratingDelta?: number;
  prizeCents?: number;
}) {
  const [copied, setCopied] = useState(false);
  const winnerId = game.rankings[0];
  const winner = game.players.find((p) => p.id === winnerId);
  const youWon = winnerId === "me";
  const captures = useMemo(() => countCaptures(game), [game]);
  const rank = rankFor(profiles[winnerId]?.rating ?? 1000);

  const shareText = `${youWon ? "I just won" : "I just lost"} a Ludo Arena match! 🎲\n${
    winner?.name ?? "Someone"
  } took the ${game.mode === "beast" ? "Beast Mode pot" : "win"} · ${game.log.length} moves${
    ratingDelta !== undefined ? ` · rating ${ratingDelta >= 0 ? "+" : ""}${ratingDelta}` : ""
  }\nhttps://ludoarenademo-1.onrender.com`;

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(shareText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2200);
    } catch {
      setCopied(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/70 p-4 backdrop-blur-sm">
      <div className="glass-strong animate-bounce-in w-full max-w-md rounded-3xl p-6 text-center">
        <div className="text-5xl">{youWon ? "🏆" : winner?.isBot ? "🤖" : "🎯"}</div>
        <h2 className="mt-3 text-2xl font-black text-white">
          {youWon ? "You won!" : `${winner?.name ?? "Bot"} wins`}
        </h2>
        <p className="mt-1 text-sm text-white/55">
          {game.mode === "beast" ? "Beast Mode" : "Free Mode"} · {game.players.length} players ·{" "}
          {game.log.filter((e) => e.type === "roll").length} rolls
        </p>

        <div className="mt-5 space-y-2 text-left">
          {game.rankings.map((id, i) => {
            const p = game.players.find((pl) => pl.id === id);
            if (!p) return null;
            const prof = profiles[id];
            return (
              <div
                key={id}
                className={cn(
                  "flex items-center gap-3 rounded-2xl border px-3 py-2",
                  i === 0 ? "border-amber-300/40 bg-amber-400/10" : "border-white/10 bg-white/5",
                )}
              >
                <span className="w-5 text-center text-sm font-bold text-white/60">{i + 1}</span>
                <Avatar emoji={prof?.avatar ?? "🤖"} size="sm" />
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-semibold text-white">{p.name}</div>
                  <div className="text-[11px] text-white/45">
                    {captures[id] ?? 0} captures · {p.tokens.filter((t) => t.progress >= 57).length}/4 home
                  </div>
                </div>
                {i === 0 && <Pill tone="gold">{rank.emoji} Winner</Pill>}
              </div>
            );
          })}
        </div>

        {ratingDelta !== undefined && (
          <div className="mt-4 grid grid-cols-2 gap-2">
            <div className="rounded-2xl bg-white/5 px-3 py-2">
              <div className="text-[10px] uppercase tracking-wider text-white/40">Rating</div>
              <div
                className={cn(
                  "text-lg font-bold tabular-nums",
                  ratingDelta >= 0 ? "text-emerald-300" : "text-rose-300",
                )}
              >
                {ratingDelta >= 0 ? "+" : ""}
                {ratingDelta}
              </div>
            </div>
            <div className="rounded-2xl bg-white/5 px-3 py-2">
              <div className="text-[10px] uppercase tracking-wider text-white/40">
                {game.mode === "beast" ? "Prize" : "Tokens home"}
              </div>
              <div className="text-lg font-bold tabular-nums text-amber-300">
                {game.mode === "beast" && prizeCents
                  ? `KES ${(prizeCents / 100).toLocaleString()}`
                  : `${game.players.find((p) => p.id === winnerId)?.tokens.filter((t) => t.progress >= 57).length ?? 0}/4`}
              </div>
            </div>
          </div>
        )}

        <div className="mt-5 flex flex-col gap-2 sm:flex-row">
          <button onClick={onPlayAgain} className="btn-primary flex-1 rounded-2xl py-3 font-bold text-white">
            Play again
          </button>
          <button
            onClick={copy}
            className="flex-1 rounded-2xl border border-white/15 bg-white/5 py-3 font-semibold text-white/80 transition hover:bg-white/10"
          >
            {copied ? "Copied ✓" : "Share result"}
          </button>
        </div>
        <button onClick={onHome} className="mt-3 text-xs text-white/45 underline-offset-2 hover:underline">
          Back to the arena
        </button>
      </div>
    </div>
  );
}
