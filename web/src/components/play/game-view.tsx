"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { applyRating, rankFor } from "@/lib/rating";
import { prizePoolFor } from "@/lib/economy";
import type { GameState } from "@/lib/engine/types";
import { currentPlayer } from "@/lib/engine/game";
import { useMatch } from "@/lib/match-store";
import { getBrowserSupabase } from "@/lib/supabase/client";
import { settleMatchAction } from "@/app/actions/settle";
import { kes, useWallet } from "@/lib/wallet-store";
import { Board } from "../board";
import { Dice } from "../dice";
import { PlayerStrip } from "../player-strip";
import { GameResult } from "../game-result";
import { Pill } from "../ui";

/** Full play surface: board + dice + player rail + result overlay. */
export function GameView({
  game,
  onExit,
  onPlayAgain,
}: {
  game: GameState;
  onExit: () => void;
  onPlayAgain: () => void;
}) {
  const { profiles, legal, roll, move, lastCaptured } = useMatch();
  const wallet = useWallet();
  const [rolling, setRolling] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [serverDelta, setServerDelta] = useState<number | undefined>(undefined);
  const [settled, setSettled] = useState(false);

  const player = currentPlayer(game);
  const humanTurn = !player.isBot;
  const moves = legal();
  const finished = game.phase === "finished";
  const yourRating = profiles["me"]?.rating ?? 1000;

  const ratingDelta = useMemo(() => {
    if (!finished) return undefined;
    const placement = Math.max(1, game.rankings.indexOf("me") + 1);
    const opponents = game.players.filter((p) => p.id !== "me").map((p) => profiles[p.id]?.rating ?? 1000);
    return applyRating(yourRating, placement, game.players.length, opponents).delta;
  }, [finished, game, profiles, yourRating]);

  useEffect(() => {
    if (game.phase !== "awaiting_move") return;
    setRolling(false);
  }, [game.phase, game.dice]);

  useEffect(() => {
    if (lastCaptured.length === 0) return;
    setToast(`💥 Captured! ${lastCaptured.length > 1 ? `${lastCaptured.length} tokens` : "token"} sent home`);
    const t = setTimeout(() => setToast(null), 1800);
    return () => clearTimeout(t);
  }, [lastCaptured]);

  // Persist the result once, on finish. Guests get a demo dry-run.
  useEffect(() => {
    if (!finished || settled) return;
    setSettled(true);
    let cancelled = false;

    (async () => {
      try {
        const supabase = getBrowserSupabase();
        const { data } = supabase ? await supabase.auth.getSession() : { data: { session: null } };
        const token = data.session?.access_token ?? null;
        const res = await settleMatchAction(token, {
          mode: game.mode,
          seed: game.seed,
          entryFee: game.entryFee,
          prizePool: game.prizePool,
          rankings: game.rankings,
          players: game.players,
          log: game.log,
          rngCursor: game.rngCursor,
        });
        if (cancelled) return;
        if (res.ratingDelta !== undefined) setServerDelta(res.ratingDelta);
        if (res.prizeCents && res.prizeCents > 0) {
          wallet.credit(res.prizeCents, "game_win", "Beast Mode win");
        }
      } catch {
        /* never block the result screen on settlement */
      }
    })();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [finished, settled]);

  const onRoll = () => {
    if (!humanTurn || game.phase !== "awaiting_roll") return;
    setRolling(true);
    roll();
    setTimeout(() => setRolling(false), 620);
  };

  const prizeCents =
    game.mode === "beast" ? prizePoolFor(game.entryFee, game.players.length) * 100 : 0;

  return (
    <main className="arena-shell">
      <header className="sticky top-0 z-30 border-b border-white/10 bg-[#0b0620]/80 backdrop-blur-lg">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-3 py-2.5 sm:px-5">
          <div className="flex items-center gap-2">
            <button
              onClick={onExit}
              className="rounded-xl border border-white/10 px-2.5 py-1.5 text-xs text-white/70 transition hover:bg-white/10"
            >
              ← Exit
            </button>
            <Pill tone={game.mode === "beast" ? "gold" : "violet"}>
              {game.mode === "beast" ? "🔥 Beast" : "🎮 Free"}
            </Pill>
          </div>
          <div className="text-center">
            {game.mode === "beast" ? (
              <>
                <div className="text-[10px] uppercase tracking-wider text-white/40">Prize pool</div>
                <div className="text-sm font-bold text-amber-300">{kes(prizeCents)}</div>
              </>
            ) : (
              <div className="text-[11px] text-white/45">No stake · keep it friendly</div>
            )}
          </div>
          <Link
            href="/wallet"
            className="rounded-xl bg-white/10 px-2.5 py-1.5 text-xs font-semibold text-white transition hover:bg-white/15"
          >
            💰 {kes(wallet.balanceCents)}
          </Link>
        </div>
      </header>

      <div className="mx-auto max-w-6xl px-3 pb-28 pt-3 sm:px-5">
        <PlayerStrip game={game} profiles={profiles} />

        <div className="mt-3 grid gap-4 lg:grid-cols-[minmax(0,1fr)_260px]">
          <div className="relative">
            <Board
              game={game}
              legalTokens={humanTurn && game.phase === "awaiting_move" ? moves : []}
              onPick={move}
              interactive={humanTurn && game.phase === "awaiting_move"}
            />
            {toast && (
              <div className="pointer-events-none absolute left-1/2 top-2 -translate-x-1/2 animate-bounce-in rounded-full bg-rose-500/90 px-3 py-1 text-xs font-bold text-white shadow-lg">
                {toast}
              </div>
            )}
          </div>

          <aside className="flex flex-col gap-3">
            <div className="glass flex flex-col items-center gap-2 rounded-3xl p-4">
              <div className="text-[11px] uppercase tracking-[0.18em] text-white/40">Turn</div>
              <div className="flex items-center gap-2 text-sm font-bold text-white">
                {player.isBot ? "🤖" : "🙂"} {player.name}
              </div>
              <Dice
                value={game.dice}
                rolling={rolling}
                onRoll={onRoll}
                disabled={!humanTurn || game.phase !== "awaiting_roll" || finished}
                label={`Roll dice for ${player.name}`}
              />
              {game.consecutiveSixes > 0 && (
                <Pill tone="gold">🎲 {game.consecutiveSixes}× six</Pill>
              )}
            </div>

            <div className="glass rounded-3xl p-4">
              <div className="mb-2 text-[11px] uppercase tracking-[0.18em] text-white/40">
                Match feed
              </div>
              <ol className="max-h-44 space-y-1 overflow-y-auto pr-1 text-[12px]">
                {game.log
                  .slice(-14)
                  .reverse()
                  .map((e, i) => (
                    <li key={`${e.at}-${i}`} className="flex items-start gap-1.5 text-white/65">
                      <span className="mt-0.5 text-white/25">•</span>
                      <span>{describe(e, game)}</span>
                    </li>
                  ))}
                {game.log.length === 0 && (
                  <li className="text-white/35">Roll the dice to start.</li>
                )}
              </ol>
            </div>

            <div className="glass rounded-3xl p-4 text-xs text-white/55">
              <div className="mb-1 flex items-center justify-between">
                <span>Your rank</span>
                <span className="font-semibold text-white">
                  {rankFor(yourRating).emoji} {rankFor(yourRating).name}
                </span>
              </div>
              <div className="text-white/35">
                Sixes roll again · captures give a bonus roll · three sixes forfeit the turn.
              </div>
            </div>
          </aside>
        </div>
      </div>

      {finished && (
        <GameResult
          game={game}
          profiles={profiles}
          onPlayAgain={onPlayAgain}
          onHome={onExit}
          ratingDelta={serverDelta ?? ratingDelta}
          prizeCents={prizeCents}
        />
      )}
    </main>
  );
}

function describe(e: GameState["log"][number], game: GameState): string {
  const name = game.players.find((p) => p.id === e.playerId)?.name ?? "Player";
  switch (e.type) {
    case "roll":
      return `${name} rolled ${e.value}`;
    case "move":
      return e.captured?.length
        ? `${name} captured ${e.captured.length} token${e.captured.length > 1 ? "s" : ""}!`
        : `${name} moved a token`;
    case "finish":
      return `🏁 ${name} finished #${e.rank}`;
    default:
      return `${name} passed`;
  }
}
