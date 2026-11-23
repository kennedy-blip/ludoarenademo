"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { GameView } from "@/components/play/game-view";
import { useMatch } from "@/lib/match-store";

/** /play hosts the active match; deep-linking without one returns home. */
export default function PlayPage() {
  const router = useRouter();
  const { game, end, startLocal } = useMatch();

  useEffect(() => {
    if (!game) router.replace("/");
  }, [game, router]);

  if (!game) {
    return (
      <div className="arena-shell grid place-items-center">
        <p className="text-sm text-white/50">Setting the table…</p>
      </div>
    );
  }

  return (
    <GameView
      game={game}
      onExit={end}
      onPlayAgain={() =>
        startLocal({
          mode: game.mode,
          entryFeeCents: game.entryFee * 100,
          opponents: game.players.length - 1,
        })
      }
    />
  );
}
