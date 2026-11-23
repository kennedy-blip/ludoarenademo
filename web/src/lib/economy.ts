import { applyRating, rankFor } from "./rating";
import type { GameState } from "./engine/types";

/** Economy constants live in one place so the ledger stays auditable. */

export const PLATFORM_RAKE = 0.1;
export const MIN_DEPOSIT = 10;
export const MIN_WITHDRAWAL = 50;
export const DAILY_BONUS_BASE = 20;
export const DAILY_BONUS_STREAK_STEP = 10;
export const DAILY_BONUS_MAX = 100;

export const ENTRY_FEES = [50, 100, 250, 500, 1000, 2500] as const;

export function prizePoolFor(entryFee: number, players: number): number {
  return Math.round(entryFee * players * (1 - PLATFORM_RAKE));
}

/** Streak-aware daily bonus: 20, 30, 40 ... capped at 100, resets if a day is missed. */
export function dailyBonus(streak: number): number {
  const clamped = Math.max(1, Math.min(streak, 10));
  return Math.min(
    DAILY_BONUS_MAX,
    DAILY_BONUS_BASE + (clamped - 1) * DAILY_BONUS_STREAK_STEP,
  );
}

export function nextStreakValue(
  currentStreak: number,
  lastClaimIso: string | null,
  now = new Date(),
): { streak: number; amount: number; claimed: boolean } {
  if (!lastClaimIso) {
    return { streak: 1, amount: dailyBonus(1), claimed: true };
  }
  const last = new Date(lastClaimIso);
  const startOfDay = (d: Date) => Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());
  const days = Math.round((startOfDay(now) - startOfDay(last)) / 86_400_000);

  if (days <= 0) return { streak: currentStreak, amount: 0, claimed: false };
  const streak = days === 1 ? currentStreak + 1 : 1;
  return { streak, amount: dailyBonus(streak), claimed: true };
}

/** Weekly tournament scoring: placing points plus a small skill bonus. */
export function tournamentPoints(
  placement: number,
  fieldSize: number,
  captured: number,
  mode: "free" | "beast",
): number {
  const base = Math.max(0, fieldSize - placement + 1) * 10;
  const captureBonus = Math.min(captured, 8) * 2;
  const moneyMultiplier = mode === "beast" ? 2 : 1;
  return Math.round((base + captureBonus) * moneyMultiplier);
}

export interface MatchSummary {
  winnerId: string;
  rankings: string[];
  ratingChanges: Record<string, { before: number; after: number; delta: number }>;
  tournamentPoints: Record<string, number>;
  hash: string;
}

/** Server-side settlement: ratings, tournament points, result hash. */
export function settleMatch(
  state: GameState,
  ratings: Record<string, number>,
): MatchSummary {
  const winnerId = state.rankings[0];
  const ratingChanges: MatchSummary["ratingChanges"] = {};
  const points: MatchSummary["tournamentPoints"] = {};
  const capturesBy = countCaptures(state);

  state.players.forEach((player) => {
    const before = ratings[player.id] ?? 1000;
    const placement = Math.max(1, state.rankings.indexOf(player.id) + 1);
    const opponents = state.players
      .filter((p) => p.id !== player.id)
      .map((p) => ratings[p.id] ?? 1000);
    const { rating, delta } = applyRating(
      before,
      placement,
      state.players.length,
      opponents,
      player.isBot,
    );
    ratingChanges[player.id] = { before, after: rating, delta };
    points[player.id] = tournamentPoints(
      placement,
      state.players.length,
      capturesBy[player.id] ?? 0,
      state.mode,
    );
  });

  return {
    winnerId,
    rankings: state.rankings,
    ratingChanges,
    tournamentPoints: points,
    hash: resultHash(state),
  };
}

export function countCaptures(state: GameState): Record<string, number> {
  const out: Record<string, number> = {};
  for (const e of state.log) {
    if (e.type === "move" && e.captured?.length) {
      out[e.playerId] = (out[e.playerId] ?? 0) + e.captured.length;
    }
  }
  return out;
}

/** Stable fingerprint used to show a match was not tampered with. */
export function resultHash(state: GameState): string {
  const payload = [
    state.seed,
    state.rngCursor,
    state.rankings.join(","),
    state.log.length,
    state.players
      .map((p) => `${p.id}:${p.tokens.map((t) => t.progress).join(".")}`)
      .join(";"),
  ].join("|");
  let h = 0x811c9dc5;
  for (let i = 0; i < payload.length; i++) {
    h ^= payload.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h.toString(16).padStart(8, "0");
}

export function rankName(rating: number): string {
  return rankFor(rating).name;
}
