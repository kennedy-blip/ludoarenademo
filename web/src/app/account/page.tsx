"use client";

import Link from "next/link";
import { useState } from "react";
import { Avatar, Card, Meter, Pill, SectionTitle, Stat } from "@/components/ui";
import { useAuth } from "@/lib/use-auth";
import { rankFor, rankProgress, nextRank } from "@/lib/rating";
import { kes } from "@/lib/wallet-store";
import { cn } from "@/lib/cn";

export default function AccountPage() {
  const auth = useAuth();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [username, setUsername] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setBusy(true);
    const err =
      mode === "signin"
        ? await auth.signIn(email, password)
        : await auth.signUp(email, password, username);
    setBusy(false);
    if (err) setError(err);
  };

  if (auth.loading) {
    return (
      <div className="arena-shell grid place-items-center">
        <p className="text-sm text-white/45">Loading account…</p>
      </div>
    );
  }

  if (auth.user && auth.profile) {
    const p = auth.profile;
    const rank = rankFor(p.rating);
    const next = nextRank(p.rating);
    const winRate = p.matches_played ? Math.round((p.matches_won / p.matches_played) * 100) : 0;

    return (
      <div className="arena-shell">
        <div className="mx-auto max-w-3xl px-4 pb-16 pt-6 sm:px-6">
          <div className="flex items-center justify-between">
            <Link href="/" className="text-sm text-white/55 hover:text-white">
              ← Arena
            </Link>
            <button
              onClick={() => auth.signOut()}
              className="text-xs text-white/45 hover:text-white"
            >
              Sign out
            </button>
          </div>

          <Card className="mt-5">
            <div className="flex items-center gap-4">
              <Avatar emoji={p.avatar_emoji} size="lg" ring="ring-violet-400/60" />
              <div className="min-w-0">
                <div className="truncate text-xl font-black text-white">{p.username}</div>
                <div className="text-[12px] text-white/45">{auth.user.email}</div>
                <Pill tone="violet" className="mt-1">
                  {rank.emoji} {rank.name} · {p.rating}
                </Pill>
              </div>
            </div>

            <div className="mt-4">
              <div className="mb-1 flex justify-between text-[11px] text-white/40">
                <span>{rank.name}</span>
                <span>{next ? `${next.name} at ${next.min}` : "Max rank"}</span>
              </div>
              <Meter value={rankProgress(p.rating)} tone="gold" />
            </div>

            <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
              <Stat label="Wallet" value={kes(p.balance_cents)} accent="text-emerald-300" />
              <Stat label="Matches" value={p.matches_played} />
              <Stat label="Wins" value={p.matches_won} />
              <Stat label="Win rate" value={`${winRate}%`} accent="text-amber-300" />
            </div>
          </Card>

          <Card className="mt-3">
            <SectionTitle eyebrow="Streaks" title="Daily bonus" />
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="text-2xl font-black text-white">
                  Day {p.bonus_streak || 1}
                </div>
                <p className="text-[12px] text-white/45">
                  Claim in the arena to keep the streak alive. Missing a day resets to 1.
                </p>
              </div>
              <Link href="/" className="btn-primary shrink-0 rounded-xl px-4 py-2.5 text-xs font-bold text-white">
                Claim in arena
              </Link>
            </div>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="arena-shell">
      <div className="mx-auto max-w-md px-4 pb-16 pt-6 sm:px-6">
        <Link href="/" className="text-sm text-white/55 hover:text-white">
          ← Arena
        </Link>

        <Card className="mt-5">
          <div className="text-center">
            <div className="text-4xl">🎲</div>
            <h1 className="mt-2 text-2xl font-black text-white">
              {mode === "signin" ? "Welcome back" : "Join the arena"}
            </h1>
            <p className="mt-1 text-[12px] text-white/45">
              {mode === "signin"
                ? "Sign in to save ratings, streaks and your wallet."
                : "Create an account to keep your progress across devices."}
            </p>
          </div>

          {!auth.configured && (
            <div className="mt-4 rounded-xl border border-amber-300/30 bg-amber-400/10 p-3 text-[11px] text-amber-200">
              Accounts are offline in this deployment. Set NEXT_PUBLIC_SUPABASE_URL and
              NEXT_PUBLIC_SUPABASE_ANON_KEY, then run the migration in{" "}
              <code>supabase/migrations</code>. Everything else (play, wallet demo, leaderboard
              seed) works without it.
            </div>
          )}

          <form onSubmit={submit} className="mt-4 space-y-3">
            {mode === "signup" && (
              <label className="block">
                <span className="text-[11px] uppercase tracking-wider text-white/40">Username</span>
                <input
                  value={username}
                  onChange={(e) => setUsername(e.target.value.replace(/[^a-zA-Z0-9_]/g, "").slice(0, 14))}
                  required
                  minLength={3}
                  placeholder="ludo_king"
                  className="mt-1 w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-white placeholder:text-white/25 focus:border-violet-400/60 focus:outline-none"
                />
              </label>
            )}
            <label className="block">
              <span className="text-[11px] uppercase tracking-wider text-white/40">Email</span>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                placeholder="you@example.com"
                className="mt-1 w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-white placeholder:text-white/25 focus:border-violet-400/60 focus:outline-none"
              />
            </label>
            <label className="block">
              <span className="text-[11px] uppercase tracking-wider text-white/40">Password</span>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
                placeholder="••••••••"
                className="mt-1 w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-white placeholder:text-white/25 focus:border-violet-400/60 focus:outline-none"
              />
            </label>

            {error && <p className="text-[12px] text-rose-300">{error}</p>}

            <button
              type="submit"
              disabled={busy || !auth.configured}
              className={cn("btn-primary w-full rounded-xl py-3 text-sm font-bold text-white")}
            >
              {busy ? "Working…" : mode === "signin" ? "Sign in" : "Create account"}
            </button>
          </form>

          <button
            onClick={() => {
              setMode(mode === "signin" ? "signup" : "signin");
              setError(null);
            }}
            className="mt-3 w-full text-center text-[12px] text-white/45 hover:text-white"
          >
            {mode === "signin" ? "New here? Create an account" : "Have an account? Sign in"}
          </button>
        </Card>

        <p className="mt-3 text-center text-[11px] text-white/30">
          Play as a guest any time — sign in only when you want your progress saved.
        </p>
      </div>
    </div>
  );
}
