"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Avatar, Card, Pill, SectionTitle, Stat } from "@/components/ui";
import { fetchLeaderboard, type LeaderboardRow } from "@/lib/data/leaderboard";
import { getBrowserSupabase } from "@/lib/supabase/client";
import { rankFor } from "@/lib/rating";
import { cn } from "@/lib/cn";

export default function LeaderboardPage() {
  const [rows, setRows] = useState<LeaderboardRow[]>([]);
  const [live, setLive] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    fetchLeaderboard(getBrowserSupabase(), 25).then(({ rows, live }) => {
      if (!mounted) return;
      setRows(rows);
      setLive(live);
      setLoading(false);
    });
    return () => {
      mounted = false;
    };
  }, []);

  const top = rows[0];
  const podium = rows.slice(0, 3);

  return (
    <div className="arena-shell">
      <div className="mx-auto max-w-4xl px-4 pb-16 pt-6 sm:px-6">
        <div className="flex items-center justify-between">
          <Link href="/" className="text-sm text-white/55 hover:text-white">
            ← Arena
          </Link>
          <Pill tone={live ? "green" : "default"}>
            {live ? "● live data" : "demo ladder"}
          </Pill>
        </div>

        <h1 className="mt-5 text-3xl font-black tracking-tight text-white sm:text-4xl">
          National <span className="gold-text">ladder</span>
        </h1>
        <p className="mt-2 max-w-lg text-sm text-white/55">
          Elo ratings from every ranked match. Bots are damped, so only human wins move this table.
        </p>

        <div className="mt-5 grid grid-cols-2 gap-2 sm:grid-cols-4">
          <Stat label="Players" value={rows.length || "—"} hint={live ? "signed in" : "seeded"} />
          <Stat label="Top rating" value={top ? top.rating : "—"} hint={top?.username ?? "—"} accent="text-amber-300" />
          <Stat label="Top win rate" value={`${Math.max(...rows.map((r) => r.win_rate), 0)}%`} hint="best record" />
          <Stat label="Season" value="1" hint="resets every Sunday" />
        </div>

        <section className="mt-6">
          <SectionTitle eyebrow="Top 3" title="Podium" />
          <div className="grid gap-2 sm:grid-cols-3">
            {podium.map((r, i) => {
              const rank = rankFor(r.rating);
              return (
                <Card key={r.id} className={cn(i === 0 && "border-amber-300/35", "text-center")}>
                  <div className="mx-auto flex w-fit">
                    <Avatar emoji={r.avatar_emoji} size="lg" />
                  </div>
                  <div className="mt-2 text-sm font-bold text-white">{r.username}</div>
                  <div className="text-[11px] text-white/45">
                    {rank.emoji} {rank.name}
                  </div>
                  <div className="mt-2 text-2xl font-black tabular-nums text-amber-300">{r.rating}</div>
                  <div className="text-[11px] text-white/40">
                    {r.matches_won}W · {r.matches_played - r.matches_won}L · {r.win_rate}%
                  </div>
                </Card>
              );
            })}
          </div>
        </section>

        <section className="mt-6">
          <SectionTitle eyebrow="Full table" title="Everyone ranked" />
          <Card className="p-0">
            <div className="divide-y divide-white/5">
              {loading && (
                <div className="p-6 text-center text-sm text-white/40">Loading ladder…</div>
              )}
              {!loading &&
                rows.map((r) => (
                  <div key={r.id} className="flex items-center gap-3 px-4 py-2.5">
                    <span className="w-6 text-center text-xs font-bold tabular-nums text-white/40">
                      {r.position}
                    </span>
                    <Avatar emoji={r.avatar_emoji} size="sm" />
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-semibold text-white">{r.username}</div>
                      <div className="text-[11px] text-white/40">
                        {r.matches_played} played · {r.win_rate}% wins
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-bold tabular-nums text-white">{r.rating}</div>
                      <div className="text-[10px] text-white/35">{rankFor(r.rating).name}</div>
                    </div>
                  </div>
                ))}
            </div>
          </Card>
        </section>

        <p className="mt-4 text-center text-[11px] text-white/30">
          {live
            ? "Live from Supabase · updated after every settled match"
            : "Demo ladder · connect Supabase env vars to show real players"}
        </p>
      </div>
    </div>
  );
}
