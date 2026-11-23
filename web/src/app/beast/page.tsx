"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Card, Pill, SectionTitle, Stat } from "@/components/ui";
import { ENTRY_FEES, PLATFORM_RAKE, prizePoolFor } from "@/lib/economy";
import { useMatch } from "@/lib/match-store";
import { kes, useWallet } from "@/lib/wallet-store";
import { cn } from "@/lib/cn";

export default function BeastPage() {
  const router = useRouter();
  const wallet = useWallet();
  const { startLocal } = useMatch();
  const [fee, setFee] = useState<number>(100);
  const [players, setPlayers] = useState(4);
  const [error, setError] = useState<string | null>(null);

  const pool = prizePoolFor(fee, players);

  const join = () => {
    setError(null);
    const cost = fee * 100;
    if (!wallet.debit(cost, "game_entry", `Beast entry · KES ${fee} · ${players} players`)) {
      setError(
        wallet.mode === "remote"
          ? "Your account balance is too low. Top up in the wallet."
          : "Not enough demo credits — add some in the wallet.",
      );
      return;
    }
    startLocal({ mode: "beast", entryFeeCents: cost, opponents: players - 1 });
    router.push("/play");
  };

  return (
    <div className="arena-shell">
      <div className="mx-auto max-w-3xl px-4 pb-16 pt-6 sm:px-6">
        <div className="flex items-center justify-between">
          <Link href="/" className="text-sm text-white/55 hover:text-white">
            ← Arena
          </Link>
          <Pill tone="gold">🔥 Beast mode</Pill>
        </div>

        <h1 className="mt-5 text-3xl font-black tracking-tight text-white sm:text-4xl">
          Stake your <span className="gold-text">skills</span>
        </h1>
        <p className="mt-2 max-w-lg text-sm text-white/55">
          Winner takes {Math.round((1 - PLATFORM_RAKE) * 100)}% of the pot. Everything is escrow-
          safe: entry is debited before the first roll, prize credited the moment the last token
          lands home.
        </p>

        <div className="mt-5 grid grid-cols-2 gap-2 sm:grid-cols-3">
          <Stat label="Balance" value={kes(wallet.balanceCents)} accent="text-emerald-300" />
          <Stat label="Prize pool" value={kes(pool * 100)} accent="text-amber-300" />
          <Stat label="Your seat" value={players} hint={`${players - 1} bots`} />
        </div>

        <Card className="mt-4">
          <SectionTitle eyebrow="Step 1" title="Pick your entry" />
          <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
            {ENTRY_FEES.map((f) => (
              <button
                key={f}
                onClick={() => setFee(f)}
                className={cn(
                  "rounded-xl border py-2.5 text-xs font-bold transition",
                  fee === f
                    ? "border-amber-300/70 bg-amber-400/20 text-amber-100"
                    : "border-white/10 bg-white/5 text-white/60 hover:bg-white/10",
                )}
              >
                {f}
              </button>
            ))}
          </div>

          <SectionTitle eyebrow="Step 2" title="Table size" />
          <div className="grid grid-cols-3 gap-2">
            {[2, 3, 4].map((n) => (
              <button
                key={n}
                onClick={() => setPlayers(n)}
                className={cn(
                  "rounded-xl border py-3 text-sm font-bold transition",
                  players === n
                    ? "border-violet-300/60 bg-violet-500/20 text-white"
                    : "border-white/10 bg-white/5 text-white/60 hover:bg-white/10",
                )}
              >
                <div>{n} players</div>
                <div className="mt-0.5 text-[10px] font-medium text-white/35">
                  win {kes(prizePoolFor(fee, n) * 100)}
                </div>
              </button>
            ))}
          </div>

          <div className="mt-4 rounded-2xl border border-white/10 bg-white/[0.04] p-3 text-[12px]">
            <div className="flex justify-between text-white/55">
              <span>Entry</span>
              <span>{kes(fee * 100)}</span>
            </div>
            <div className="flex justify-between text-white/55">
              <span>Platform fee (10%)</span>
              <span>{kes(Math.round(fee * players * PLATFORM_RAKE) * 100)}</span>
            </div>
            <div className="mt-1.5 flex justify-between border-t border-white/10 pt-1.5 font-bold text-white">
              <span>Winner takes</span>
              <span className="text-amber-300">{kes(pool * 100)}</span>
            </div>
          </div>

          {error && <p className="mt-3 text-[12px] text-rose-300">{error}</p>}

          <button onClick={join} className="btn-primary mt-4 w-full rounded-2xl py-3.5 text-sm font-bold text-white">
            Pay {kes(fee * 100)} &amp; start
          </button>
          <p className="mt-2 text-center text-[10px] text-white/30">
            Demo settlement · M-Pesa STK comes online with Daraja credentials
          </p>
        </Card>
      </div>
    </div>
  );
}
