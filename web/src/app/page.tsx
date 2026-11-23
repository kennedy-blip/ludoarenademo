"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Board } from "@/components/board";
import { GameView } from "@/components/play/game-view";
import { Avatar, Card, Meter, Pill, SectionTitle, Stat } from "@/components/ui";
import { createGame } from "@/lib/engine/game";
import type { GameState } from "@/lib/engine/types";
import { nextStreakValue } from "@/lib/economy";
import { useMatch } from "@/lib/match-store";
import { rankFor, rankProgress, RANKS } from "@/lib/rating";
import { kes, useWallet } from "@/lib/wallet-store";

const DEMO_SEED = 20260510;
const BONUS_KEY = "ludo-bonus";

export default function HomePage() {
  const wallet = useWallet();
  const { game, startLocal, end } = useMatch();
  const [showcase] = useState<GameState>(() =>
    createGame(
      [
        { id: "me", name: "You", color: "red" },
        { id: "simba", name: "Simba_254", color: "green", isBot: true },
        { id: "ace", name: "NairobiAce", color: "yellow", isBot: true },
        { id: "king", name: "MombasaKing", color: "blue", isBot: true },
      ],
      { seed: DEMO_SEED },
    ),
  );

  const [streak, setStreak] = useState<{ streak: number; amount: number; claimed: boolean }>({
    streak: 0,
    amount: 0,
    claimed: true,
  });
  const [claimedNow, setClaimedNow] = useState(false);

  useEffect(() => {
    const raw = localStorage.getItem(BONUS_KEY);
    const parsed = raw ? (JSON.parse(raw) as { streak: number; last: string }) : null;
    setStreak(nextStreakValue(parsed?.streak ?? 0, parsed?.last ?? null));
  }, []);

  const claimBonus = () => {
    if (!streak.claimed) return;
    wallet.credit(streak.amount * 100, "bonus", `Daily bonus · day ${streak.streak}`);
    localStorage.setItem(
      BONUS_KEY,
      JSON.stringify({ streak: streak.streak, last: new Date().toISOString() }),
    );
    setClaimedNow(true);
  };

  const start = (mode: "free" | "beast", fee: number, opponents: number) => {
    if (mode === "beast") {
      const cost = fee * 100;
      if (!wallet.debit(cost, "game_entry", `Beast Mode entry · ${opponents + 1} players`)) return;
    }
    startLocal({ mode, entryFeeCents: fee * 100, opponents });
  };

  if (game) {
    return <GameView game={game} onExit={end} onPlayAgain={() => startLocal({ mode: game.mode, entryFeeCents: game.entryFee * 100, opponents: game.players.length - 1 })} />;
  }

  const rating = 1000 + (wallet.balanceCents > 0 ? 0 : 0);
  const rank = rankFor(rating);

  return (
    <div className="arena-shell">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4 sm:px-6">
        <div className="flex items-center gap-2">
          <span className="grid h-9 w-9 place-items-center rounded-2xl bg-gradient-to-br from-violet-500 to-fuchsia-500 text-lg shadow-lg">
            🎲
          </span>
          <div className="leading-tight">
            <div className="text-sm font-black tracking-tight text-white">LUDO ARENA</div>
            <div className="text-[10px] uppercase tracking-[0.22em] text-violet-300/70">Kenya</div>
          </div>
        </div>
        <nav className="flex items-center gap-1.5 text-xs sm:gap-2 sm:text-sm">
          <Link href="/leaderboard" className="rounded-xl px-2.5 py-1.5 text-white/65 transition hover:bg-white/10 hover:text-white">
            Leaderboard
          </Link>
          <Link href="/tournament" className="hidden rounded-xl px-2.5 py-1.5 text-white/65 transition hover:bg-white/10 hover:text-white sm:block">
            Tournament
          </Link>
          <Link href="/account" className="rounded-xl px-2.5 py-1.5 text-white/65 transition hover:bg-white/10 hover:text-white">
            Account
          </Link>
          <Link href="/wallet" className="rounded-xl border border-white/10 bg-white/5 px-2.5 py-1.5 font-semibold text-white">
            💰 {kes(wallet.balanceCents)}
          </Link>
        </nav>
      </header>

      <main className="mx-auto max-w-6xl px-4 pb-16 sm:px-6">
        <section className="grid items-center gap-8 pt-6 lg:grid-cols-[1.05fr_1fr] lg:pt-12">
          <div>
            <Pill tone="violet">🎯 Season 1 · weekly tournament live</Pill>
            <h1 className="mt-4 text-4xl font-black leading-[1.05] tracking-tight text-white sm:text-5xl lg:text-6xl">
              Play Ludo.
              <br />
              <span className="gold-text">Climb the ranks.</span>
              <br />
              Own the week.
            </h1>
            <p className="mt-4 max-w-md text-sm leading-relaxed text-white/60 sm:text-base">
              Kenya&apos;s home of Ludo. Free practice against smart bots, Beast Mode stakes
              settled in M-Pesa, and a national leaderboard that actually means something.
            </p>

            <div className="mt-6 flex flex-wrap items-center gap-3">
              <button
                onClick={() => start("free", 0, 3)}
                className="btn-primary rounded-2xl px-6 py-3.5 text-sm font-bold text-white sm:text-base"
              >
                ▶ Play free now
              </button>
              <Link
                href="/beast"
                className="rounded-2xl border border-amber-300/35 bg-amber-400/10 px-6 py-3.5 text-sm font-bold text-amber-200 transition hover:bg-amber-400/20 sm:text-base"
              >
                🔥 Beast Mode
              </Link>
            </div>

            <div className="mt-7 grid grid-cols-2 gap-2 sm:grid-cols-4">
              <Stat label="Your rating" value={`${rank.emoji} ${rating}`} hint={rank.name} />
              <Stat label="Win rate" value="—" hint="play 1 match" />
              <Stat label="Streak" value={`${streak.streak} day${streak.streak === 1 ? "" : "s"}`} hint={`${kes(streak.amount * 100)} ready`} />
              <Stat label="Season" value="#—" hint="joins after 3 games" accent="text-amber-300" />
            </div>

            <div className="glass mt-3 flex items-center gap-3 rounded-2xl p-3">
              <Avatar emoji="🎁" />
              <div className="min-w-0 flex-1">
                <div className="text-sm font-semibold text-white">
                  {claimedNow ? "Bonus claimed!" : streak.claimed ? "Daily bonus ready" : "Come back tomorrow"}
                </div>
                <div className="text-[11px] text-white/45">
                  {streak.claimed
                    ? `Day ${streak.streak} streak · claim ${kes(streak.amount * 100)}`
                    : "Streak kept alive · next bonus at midnight UTC"}
                </div>
              </div>
              <button
                onClick={claimBonus}
                disabled={!streak.claimed || claimedNow}
                className="rounded-xl bg-emerald-500/90 px-3 py-2 text-xs font-bold text-white transition hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-40"
              >
                Claim
              </button>
            </div>
          </div>

          <div className="relative">
            <Board game={showcase} legalTokens={[]} onPick={() => {}} interactive={false} />
            <div className="pointer-events-none absolute -bottom-2 left-1/2 flex -translate-x-1/2 gap-1.5 rounded-full border border-white/15 bg-[#120a2e]/90 px-3 py-1.5 text-[10px] text-white/60 shadow-xl">
              <span className="text-emerald-300">● live board</span>
              <span className="text-white/20">|</span>
              <span>52-cell track · 4 yards · exact finish</span>
            </div>
          </div>
        </section>

        <section className="mt-14">
          <SectionTitle eyebrow="Choose your table" title="Two ways to play" />
          <div className="grid gap-3 sm:grid-cols-2">
            <Card glow className="relative overflow-hidden">
              <div className="flex items-start justify-between">
                <div>
                  <Pill tone="violet">🎮 Free mode</Pill>
                  <h3 className="mt-3 text-xl font-bold text-white">Practice &amp; rank up</h3>
                  <p className="mt-1 text-sm text-white/55">
                    No stake. Ratings still count, so every win moves you up the ladder.
                  </p>
                </div>
                <span className="text-4xl">🎲</span>
              </div>
              <ul className="mt-4 space-y-1.5 text-[13px] text-white/60">
                <li>✓ Smart bots with capture logic</li>
                <li>✓ 2–4 players per table</li>
                <li>✓ Counts toward weekly tournament</li>
              </ul>
              <button
                onClick={() => start("free", 0, 3)}
                className="mt-4 w-full rounded-2xl bg-white/10 py-3 text-sm font-bold text-white transition hover:bg-white/15"
              >
                Start free match
              </button>
            </Card>

            <Card className="relative overflow-hidden border-amber-300/25">
              <div className="flex items-start justify-between">
                <div>
                  <Pill tone="gold">🔥 Beast mode</Pill>
                  <h3 className="mt-3 text-xl font-bold text-white">Stake. Win. Withdraw.</h3>
                  <p className="mt-1 text-sm text-white/55">
                    90% of the pot goes to the winner. Settled through the M-Pesa ledger.
                  </p>
                </div>
                <span className="text-4xl">🏆</span>
              </div>
              <ul className="mt-4 space-y-1.5 text-[13px] text-white/60">
                <li>💰 Entry from KES 50</li>
                <li>🛡️ Demo-safe wallet until Daraja keys are live</li>
                <li>⚡ Instant ledger settlement</li>
              </ul>
              <div className="mt-4 grid grid-cols-3 gap-2">
                {[50, 100, 250].map((fee) => (
                  <button
                    key={fee}
                    onClick={() => start("beast", fee, 3)}
                    className="rounded-xl border border-amber-300/30 bg-amber-400/10 py-2 text-xs font-bold text-amber-200 transition hover:bg-amber-400/20"
                  >
                    KES {fee}
                  </button>
                ))}
              </div>
            </Card>
          </div>
        </section>

        <section className="mt-14 grid gap-3 lg:grid-cols-[1.2fr_1fr]">
          <Card>
            <SectionTitle
              eyebrow="Progression"
              title="Ranks you can actually reach"
              action={<Link href="/leaderboard" className="text-xs text-violet-300 hover:underline">Full ladder →</Link>}
            />
            <div className="space-y-2">
              {RANKS.map((r, i) => {
                const active = r.id === rank.id;
                return (
                  <div
                    key={r.id}
                    className={`flex items-center gap-3 rounded-2xl px-3 py-2 ${
                      active ? "bg-violet-500/15 ring-1 ring-violet-400/40" : "bg-white/[0.035]"
                    }`}
                  >
                    <span className="text-lg">{r.emoji}</span>
                    <div className="flex-1">
                      <div className="flex items-center justify-between text-sm">
                        <span className={active ? "font-bold text-white" : "text-white/70"}>{r.name}</span>
                        <span className="tabular-nums text-[11px] text-white/40">{r.min}+</span>
                      </div>
                      {i === 0 && <Meter value={rankProgress(rating)} />}
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>

          <Card>
            <SectionTitle eyebrow="How it works" title="Fair play, in the open" />
            <ol className="space-y-3 text-[13px] text-white/60">
              <li className="flex gap-3">
                <span className="grid h-6 w-6 shrink-0 place-items-center rounded-lg bg-violet-500/25 text-[11px] font-bold text-violet-200">1</span>
                Every match runs on a seeded engine, so a game can be replayed and verified move-for-move.
              </li>
              <li className="flex gap-3">
                <span className="grid h-6 w-6 shrink-0 place-items-center rounded-lg bg-violet-500/25 text-[11px] font-bold text-violet-200">2</span>
                Ratings are Elo-based with a damping factor against bots, so farming bots never climbs the ladder.
              </li>
              <li className="flex gap-3">
                <span className="grid h-6 w-6 shrink-0 place-items-center rounded-lg bg-violet-500/25 text-[11px] font-bold text-violet-200">3</span>
                Wallet movements are ledger rows in Postgres — integer cents, never floating point.
              </li>
            </ol>
            <div className="mt-4 rounded-2xl border border-white/10 bg-white/[0.04] p-3 text-[11px] text-white/45">
              Demo build: wallet credits are play money. Real M-Pesa deposits switch on when Daraja
              credentials are added to the deployment.
            </div>
            <Link
              href="/account"
              className="mt-2 flex items-center justify-between rounded-2xl border border-violet-400/25 bg-violet-500/10 px-3 py-2.5 text-[12px] font-semibold text-violet-100 transition hover:bg-violet-500/20"
            >
              <span>👤 Save your progress</span>
              <span className="text-white/45">Account →</span>
            </Link>
          </Card>
        </section>
      </main>

      <footer className="border-t border-white/10 py-6 text-center text-[11px] text-white/30">
        Ludo Arena KE · built for Kenya 🇰🇪 · play responsibly, 18+
      </footer>
    </div>
  );
}
