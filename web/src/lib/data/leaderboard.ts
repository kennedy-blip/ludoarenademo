import type { SupabaseClient } from "@supabase/supabase-js";

export interface LeaderboardRow {
  id: string;
  username: string;
  avatar_emoji: string;
  rating: number;
  matches_played: number;
  matches_won: number;
  win_rate: number;
  position: number;
}

/** Demo rivals shown before Supabase is wired up. Deterministic, clearly fake. */
export const SEED_LEADERBOARD: LeaderboardRow[] = [
  { id: "bot-1", username: "Simba_254", avatar_emoji: "🦁", rating: 1380, matches_played: 64, matches_won: 38, win_rate: 59, position: 1 },
  { id: "bot-2", username: "NairobiAce", avatar_emoji: "🃏", rating: 1310, matches_played: 51, matches_won: 27, win_rate: 53, position: 2 },
  { id: "bot-3", username: "MombasaKing", avatar_emoji: "👑", rating: 1255, matches_played: 47, matches_won: 22, win_rate: 47, position: 3 },
  { id: "bot-4", username: "KisumuSwift", avatar_emoji: "⚡", rating: 1180, matches_played: 39, matches_won: 17, win_rate: 44, position: 4 },
  { id: "bot-5", username: "EldoretRider", avatar_emoji: "🏇", rating: 1090, matches_played: 28, matches_won: 9, win_rate: 32, position: 5 },
];

export async function fetchLeaderboard(
  supabase: SupabaseClient | null,
  limit = 20,
): Promise<{ rows: LeaderboardRow[]; live: boolean }> {
  if (!supabase) return { rows: SEED_LEADERBOARD.slice(0, limit), live: false };
  const { data, error } = await supabase
    .from("ludo_leaderboard")
    .select("*")
    .order("position", { ascending: true })
    .limit(limit);
  if (error || !data || data.length === 0) {
    return { rows: SEED_LEADERBOARD.slice(0, limit), live: false };
  }
  return { rows: data as LeaderboardRow[], live: true };
}
