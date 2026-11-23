/** Elo-style rating tuned for casual Ludo: small K, bot damping, no inflation. */

export interface RatingResult {
  rating: number;
  delta: number;
}

const K_BY_RESULT = { win: 32, loss: 16 } as const;

export function expectedScore(rating: number, opponentRating: number): number {
  return 1 / (1 + Math.pow(10, (opponentRating - rating) / 400));
}

/**
 * @param placement 1-based finishing position
 * @param fieldSize number of players in the match
 * @param vsBot     damp changes against bots so farming is unprofitable
 */
export function applyRating(
  rating: number,
  placement: number,
  fieldSize: number,
  opponents: number[],
  vsBot = false,
): RatingResult {
  const opponentsAvg =
    opponents.length > 0
      ? opponents.reduce((a, b) => a + b, 0) / opponents.length
      : rating;

  const expected = expectedScore(rating, opponentsAvg);
  const actual = fieldSize > 1 ? (fieldSize - placement) / (fieldSize - 1) : 1;
  const k = placement === 1 ? K_BY_RESULT.win : K_BY_RESULT.loss;
  const damp = vsBot ? 0.35 : 1;

  const delta = Math.round((k * (actual - expected)) * damp);
  return { rating: Math.max(100, rating + delta), delta };
}

export interface Rank {
  id: string;
  name: string;
  min: number;
  emoji: string;
}

export const RANKS: Rank[] = [
  { id: "mwanzo", name: "Mwanzo", min: 0, emoji: "🌱" },
  { id: "shujaa", name: "Shujaa", min: 1100, emoji: "🛡️" },
  { id: "simba", name: "Simba", min: 1250, emoji: "🦁" },
  { id: "mfalme", name: "Mfalme", min: 1400, emoji: "👑" },
  { id: "legend", name: "Legend", min: 1600, emoji: "🔥" },
];

export function rankFor(rating: number): Rank {
  let current = RANKS[0];
  for (const r of RANKS) if (rating >= r.min) current = r;
  return current;
}

export function nextRank(rating: number): Rank | null {
  return RANKS.find((r) => r.min > rating) ?? null;
}

/** Progress (0..1) toward the next rank, for the profile meter. */
export function rankProgress(rating: number): number {
  const next = nextRank(rating);
  if (!next) return 1;
  const current = rankFor(rating);
  const span = next.min - current.min;
  return span <= 0 ? 1 : Math.min(1, (rating - current.min) / span);
}
