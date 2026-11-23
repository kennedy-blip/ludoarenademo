"use client";

import Link from "next/link";
import { Avatar, Card, Pill, SectionTitle, Stat } from "@/components/ui";
import { SEED_LEADERBOARD } from "@/lib/data/leaderboard";
import { tournamentPoints } from "@/lib/economy";
import { rankFor } from "@/lib/rating";

const WEEK_START = new Date(Date.UTC(2026, 10, 23)); // Monday of the current week
const WEEK_END = new Date(Date.UTC(2026, 10, 29, 23, 59));

const DEMO_POINTS = [410, 360, 315, 280, 240, 190, 150, 120];

export default function TournamentPage() {
  const rows = SEED_LEADERBOARD.map((r, i) => ({
    ...r,
    points: DEMO_POINTS[i] ?? 0,
    weekMatches: 14 - i,
  }));

  const daysLeft = Math.max(
    0,
    Math.ceil((WEEK_END.getTime() - Date.now()) / 86_400_000),
  );

  return (
    <div className="arena-shell">
      <div className="mx-auto max-w-4xl px-4 pb-16 pt-6 sm:px-6">
        <div className="flex items-center justify-between">
          <Link href="/" className="text-sm text-white/55 hover:text-white">
            ← Arena
          </Link>
          <Pill tone="gold">🔥 Week 1 · live</Pill>
        </div>

        <h1 className="mt-5 text-3xl font-black tracking-tight text-white sm:text-4xl">
          Weekly <span className="gold-text">tournament</span>
        </h1>
        <p className="mt-2 max-w-lg text-sm text-white/55">
          Every ranked match earns tournament points. Placement points double in Beast Mode, and
          captures add a small skill bonus. Top 3 split the prize pool on Sunday.
        </p>

        <div className="mt-5 grid grid-cols-2 gap-2 sm:grid-cols-4">
          <Stat label="Days left" value={daysLeft} hint="until reset" accent="text-amber-300" />
          <Stat label="Prize pool" value="KES 7,500" hint="top 3 split" accent="text-emerald-300" />
          <Stat label="Your points" value="0" hint="play to enter" />
          <Stat label="Your rank" value="—" hint="min 3 matches" />
        </div>

        <section className="mt-6">
          <SectionTitle
            eyebrow="Scoring"
            title="How points are earned"
            action={<span className="text-[11px] text-white/35">win = 40 · 2nd = 30 · capture = +2</span>}
          />
          <div className="grid gap-2 sm:grid-cols-3">
            {[
              { t: "Placement", d: `${tournamentPoints(1, 4, 0, "free")} pts for a win in a 4-player table.`, e: "🥇" },
              { t: "Captures", d: "2 points per capture, capped at 8 per match.", e: "💥" },
              { t: "Beast bonus", d: "Every point doubles in staked matches.", e: "🔥" },
            ].map((x) => (
              <Card key={x.t}>
                <div className="text-2xl">{x.e}</div>
                <div className="mt-1 text-sm font-bold text-white">{x.t}</div>
                <p className="mt-1 text-[12px] text-white/50">{x.d}</p>
              </Card>
            ))}
          </div>
        </section>

        <section className="mt-6">
          <SectionTitle eyebrow="Standings" title="This week" />
          <Card className="p-0">
            <div className="divide-y divide-white/5">
              {rows.map((r, i) => (
                <div key={r.id} className="flex items-center gap-3 px-4 py-2.5">
                  <span className="w-6 text-center text-xs font-bold tabular-nums text-white/40">
                    {i + 1}
                  </span>
                  <Avatar emoji={r.avatar_emoji} size="sm" />
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-semibold text-white">{r.username}</div>
                    <div className="text-[11px] text-white/40">
                      {r.weekMatches} matches · {rankFor(r.rating).emoji} {rankFor(r.rating).name}
                    </div>
                  </div>
                  <div className="text-sm font-bold tabular-nums text-amber-300">{r.points}</div>
                </div>
              ))}
            </div>
          </Card>
        </section>

        <Card className="mt-6 border-amber-300/25">
          <div className="flex items-center justify-between gap-4">
            <div>
              <div className="text-sm font-bold text-white">Get on the board</div>
              <p className="mt-1 text-[12px] text-white/50">
                Three ranked matches unlock your tournament position.
              </p>
            </div>
            <Link href="/" className="btn-primary shrink-0 rounded-2xl px-5 py-3 text-sm font-bold text-white">
              Play now
            </Link>
          </div>
        </Card>

        <p className="mt-4 text-center text-[11px] text-white/30">
          Week runs {WEEK_START.toUTCString().slice(0, 16)} → {WEEK_END.toUTCString().slice(0, 16)}
        </p>
      </div>
    </div>
  );
}
