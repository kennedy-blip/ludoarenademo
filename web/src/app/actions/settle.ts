"use server";

import { createClient } from "@supabase/supabase-js";
import { getAdminSupabase } from "@/lib/supabase/server";
import { SUPABASE_ANON_KEY, SUPABASE_URL, isSupabaseConfigured } from "@/lib/supabase/config";
import { settleMatch } from "@/lib/economy";
import type { GameState } from "@/lib/engine/types";

export interface SettleResult {
  ok: boolean;
  demo: boolean;
  message: string;
  ratingDelta?: number;
  prizeCents?: number;
  hash?: string;
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Persist a finished local match.
 *
 * Guest / demo installs get a dry-run response so the UI still shows rating
 * deltas; signed-in users get rows in matches, match_players, wallets and the
 * tournament table — all written with the service role after the token is
 * verified, so the client can never edit its own bankroll.
 */
export async function settleMatchAction(
  accessToken: string | null,
  snapshot: Pick<GameState, "mode" | "seed" | "entryFee" | "prizePool" | "rankings" | "players" | "log" | "rngCursor">,
): Promise<SettleResult> {
  const admin = getAdminSupabase();

  if (!isSupabaseConfigured() || !admin || !accessToken) {
    const ratings = Object.fromEntries(snapshot.players.map((p) => [p.id, p.isBot ? 1100 : 1000]));
    const summary = settleMatch(snapshot as GameState, ratings);
    return {
      ok: true,
      demo: true,
      message: "Demo settlement — connect Supabase to persist ranked matches.",
      ratingDelta: summary.ratingChanges["me"]?.delta,
      hash: summary.hash,
    };
  }

  // Verify the caller.
  const userClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    global: { headers: { Authorization: `Bearer ${accessToken}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data: auth } = await userClient.auth.getUser(accessToken);
  const user = auth.user;
  if (!user) return { ok: false, demo: false, message: "Session expired — sign in again." };

  const { data: profile } = await admin
    .from("profiles")
    .select("id,rating,matches_played,matches_won")
    .eq("id", user.id)
    .maybeSingle();
  if (!profile) return { ok: false, demo: false, message: "Profile missing." };

  // Ratings for the human seats we know about; bots use their seeded rating.
  const ratings: Record<string, number> = {};
  const humanIds = snapshot.players.filter((p) => !p.isBot && UUID_RE.test(p.id)).map((p) => p.id);
  if (humanIds.length > 0) {
    const { data: humans } = await admin
      .from("profiles")
      .select("id,rating")
      .in("id", humanIds);
    (humans ?? []).forEach((h) => (ratings[h.id] = h.rating));
  }
  snapshot.players.forEach((p) => {
    if (!(p.id in ratings)) ratings[p.id] = p.isBot ? 1150 : 1000;
  });

  const summary = settleMatch(snapshot as GameState, ratings);
  const winnerId = snapshot.rankings[0];
  const youWon = winnerId === user.id;
  const prizeCents = youWon && snapshot.mode === "beast" ? snapshot.prizePool * 100 : 0;

  // 1. match row
  const { data: match, error: matchErr } = await admin
    .from("matches")
    .insert({
      mode: snapshot.mode,
      seed: snapshot.seed,
      entry_fee_cents: snapshot.entryFee * 100,
      prize_pool_cents: snapshot.mode === "beast" ? snapshot.prizePool * 100 : 0,
      winner_id: wonByHuman(winnerId, snapshot.players) ? winnerId : null,
      result_hash: summary.hash,
      replay: snapshot.log,
    })
    .select("id")
    .single();

  if (matchErr || !match) {
    return { ok: false, demo: false, message: `Could not save match: ${matchErr?.message ?? "unknown"}` };
  }

  // 2. per-player rows
  const playerRows = snapshot.players
    .filter((p) => !p.isBot && UUID_RE.test(p.id))
    .map((p) => ({
      match_id: match.id,
      user_id: p.id,
      placement: Math.max(1, snapshot.rankings.indexOf(p.id) + 1),
      rating_before: summary.ratingChanges[p.id]?.before ?? 1000,
      rating_after: summary.ratingChanges[p.id]?.after ?? 1000,
      captures: 0,
      is_bot: false,
    }));
  if (playerRows.length > 0) await admin.from("match_players").insert(playerRows);

  // 3. rating + counters
  const mine = summary.ratingChanges[user.id];
  if (mine) {
    await admin
      .from("profiles")
      .update({
        rating: mine.after,
        matches_played: (profile.matches_played ?? 0) + 1,
        matches_won: (profile.matches_won ?? 0) + (youWon ? 1 : 0),
      })
      .eq("id", user.id);
  }

  // 4. prize credit, atomically through the ledger function
  if (prizeCents > 0) {
    await admin.rpc("credit_wallet", {
      p_user: user.id,
      p_amount: prizeCents,
      p_kind: "game_win",
      p_description: `Beast Mode win · ${snapshot.players.length} players`,
      p_reference: match.id,
    });
  }

  // 5. weekly tournament standings (created on demand for the current week)
  await admin.rpc("ensure_current_tournament");
  const { data: tournament } = await admin
    .from("tournaments")
    .select("id")
    .order("starts_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (tournament) {
    await admin.from("tournament_entries").upsert(
      {
        tournament_id: tournament.id,
        user_id: user.id,
        points: summary.tournamentPoints[user.id] ?? 0,
        matches: 1,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "tournament_id,user_id", ignoreDuplicates: true },
    );
    // Increment rather than replace on repeat plays.
    await admin.rpc("add_tournament_points", {
      p_tournament: tournament.id,
      p_user: user.id,
      p_points: summary.tournamentPoints[user.id] ?? 0,
    });
  }

  return {
    ok: true,
    demo: false,
    message: youWon ? "Match saved — you won!" : "Match saved.",
    ratingDelta: mine?.delta,
    prizeCents,
    hash: summary.hash,
  };
}

function wonByHuman(winnerId: string, players: GameState["players"]): boolean {
  const winner = players.find((p) => p.id === winnerId);
  return Boolean(winner && !winner.isBot && UUID_RE.test(winnerId));
}
