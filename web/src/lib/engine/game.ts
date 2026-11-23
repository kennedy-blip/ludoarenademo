import { nextRandom } from "./rng";
import { DEFAULT_RULES, HOME, RING_LAST, YARD } from "./types";
import type {
  GameState,
  PlayerSeed,
  PlayerState,
  RulesConfig,
  TokenState,
} from "./types";
import { isSafe, onRing, toAbsolute } from "./board";

const TOKENS_PER_PLAYER = 4;

/** Pure functions only: state in -> new state out. No timers, no I/O.
 *  Every mutation is funnelled through here so the client and server agree. */

function clone(state: GameState): GameState {
  return {
    ...state,
    players: state.players.map((p) => ({
      ...p,
      tokens: p.tokens.map((t) => ({ ...t })),
    })),
    rankings: [...state.rankings],
    log: [...state.log],
  };
}

export function createGame(
  players: PlayerSeed[],
  opts: { seed: number; mode?: GameState["mode"]; entryFee?: number } = { seed: 1 },
): GameState {
  if (players.length < 2 || players.length > 4) {
    throw new Error("Ludo needs 2 to 4 players");
  }
  const entryFee = opts.entryFee ?? 0;
  const pot = entryFee > 0 ? entryFee * players.length : 0;
  const state: GameState = {
    version: 1,
    mode: opts.mode ?? "free",
    seed: opts.seed >>> 0,
    rngCursor: 0,
    players: players.map((p) => ({
      id: p.id,
      name: p.name,
      color: p.color,
      isBot: p.isBot ?? false,
      tokens: Array.from({ length: TOKENS_PER_PLAYER }, (_, id) => ({
        id,
        progress: YARD,
      })) as TokenState[],
      finishedRank: null,
    })) as PlayerState[],
    turn: 0,
    dice: null,
    phase: "awaiting_roll",
    consecutiveSixes: 0,
    rankings: [],
    entryFee,
    prizePool: Math.round(pot * 0.9),
    log: [],
    tick: 0,
  };
  return state;
}

export function currentPlayer(state: GameState): PlayerState {
  return state.players[state.turn];
}

export function isHumanTurn(state: GameState): boolean {
  return !currentPlayer(state).isBot && state.phase !== "finished";
}

/** Target progress for a token, or null when the move is illegal. */
export function targetProgress(
  state: GameState,
  player: PlayerState,
  token: TokenState,
  dice: number,
  rules: RulesConfig = DEFAULT_RULES,
): number | null {
  if (token.progress >= HOME) return null;

  if (token.progress === YARD) {
    return dice === 6 ? 0 : null;
  }
  const next = token.progress + dice;
  if (rules.exactFinish) {
    return next <= HOME ? next : null;
  }
  return Math.min(next, HOME);
}

export function legalTokens(
  state: GameState,
  dice: number = state.dice ?? 0,
  rules: RulesConfig = DEFAULT_RULES,
): number[] {
  const player = currentPlayer(state);
  return player.tokens
    .filter((t) => targetProgress(state, player, t, dice, rules) !== null)
    .map((t) => t.id);
}

/** Roll the dice. Deterministic in `seed` + `rngCursor`. */
export function rollDice(
  state: GameState,
  rules: RulesConfig = DEFAULT_RULES,
): GameState {
  if (state.phase !== "awaiting_roll") return state;

  const next = clone(state);
  const { value, cursor } = nextRandom(state.seed, state.rngCursor);
  next.rngCursor = cursor;
  next.dice = value;
  next.tick += 1;
  const player = currentPlayer(next);

  next.log.push({ type: "roll", playerId: player.id, value, at: next.tick });

  const sixes = value === 6 ? state.consecutiveSixes + 1 : 0;
  next.consecutiveSixes = sixes;

  if (rules.threeSixBust && sixes >= 3) {
    next.tick += 1;
    next.log.push({ type: "pass", playerId: player.id, at: next.tick });
    next.dice = null;
    next.consecutiveSixes = 0;
    next.phase = "awaiting_roll";
    next.turn = (state.turn + 1) % state.players.length;
    return next;
  }

  const moves = legalTokens(next, value, rules);
  if (moves.length === 0) {
    next.tick += 1;
    next.log.push({ type: "pass", playerId: player.id, at: next.tick });
    next.dice = null;
    next.consecutiveSixes = 0;
    next.phase = "awaiting_roll";
    next.turn = (state.turn + 1) % state.players.length;
    return next;
  }

  next.phase = "awaiting_move";
  return next;
}

export interface MoveResult {
  state: GameState;
  captured: string[];
  finished: boolean;
}

/** Apply a token move for the player whose turn it is. */
export function moveToken(
  state: GameState,
  tokenId: number,
  rules: RulesConfig = DEFAULT_RULES,
): MoveResult {
  if (state.phase !== "awaiting_move") {
    return { state, captured: [], finished: false };
  }
  const player = currentPlayer(state);
  const token = player.tokens.find((t) => t.id === tokenId);
  if (!token || state.dice === null) {
    return { state, captured: [], finished: false };
  }
  const to = targetProgress(state, player, token, state.dice, rules);
  if (to === null) return { state, captured: [], finished: false };

  const next = clone(state);
  const mover = next.players[next.turn];
  const moving = mover.tokens.find((t) => t.id === tokenId)!;
  const from = moving.progress;
  moving.progress = to;

  const captured: string[] = [];
  if (onRing(to) && !isSafe(toAbsolute(mover.color, to))) {
    for (const opponent of next.players) {
      if (opponent.id === mover.id) continue;
      for (const t of opponent.tokens) {
        if (!onRing(t.progress)) continue;
        if (toAbsolute(opponent.color, t.progress) === toAbsolute(mover.color, to)) {
          t.progress = YARD;
          captured.push(`${opponent.id}:${t.id}`);
        }
      }
    }
  }

  next.tick += 1;
  next.log.push({
    type: "move",
    playerId: mover.id,
    tokenId,
    from,
    to,
    captured: captured.length ? captured : undefined,
    at: next.tick,
  });

  const justFinished = to === HOME;
  const allHome = mover.tokens.every((t) => t.progress >= HOME);
  const finished = justFinished && allHome;

  if (finished && mover.finishedRank === null) {
    next.tick += 1;
    mover.finishedRank = next.rankings.length + 1;
    next.rankings.push(mover.id);
    next.log.push({
      type: "finish",
      playerId: mover.id,
      rank: mover.finishedRank,
      at: next.tick,
    });
  }

  // First player to bring all four tokens home wins; everyone else is ranked
  // by how far they travelled. Keeps money matches short and unambiguous.
  const winnerKnown = next.rankings.length >= 1;

  next.dice = null;

  if (winnerKnown) {
    // Everyone who has not finished is ranked by how far they got.
    const remaining = next.players
      .filter((p) => !next.rankings.includes(p.id))
      .sort(
        (a, b) =>
          b.tokens.reduce((s, t) => s + Math.max(t.progress, 0), 0) -
          a.tokens.reduce((s, t) => s + Math.max(t.progress, 0), 0),
      )
      .map((p) => p.id);
    next.rankings.push(...remaining);
    next.phase = "finished";
    return { state: next, captured, finished };
  }

  next.phase = "awaiting_roll";
  const bonus =
    (rules.sixRollsAgain && state.dice === 6) ||
    (rules.captureRollsAgain && captured.length > 0);

  if (bonus) {
    if (state.dice !== 6) next.consecutiveSixes = 0;
  } else {
    next.consecutiveSixes = 0;
    next.turn = (state.turn + 1) % next.players.length;
  }
  return { state: next, captured, finished };
}

export function winnerId(state: GameState): string | null {
  return state.rankings[0] ?? null;
}

/** Simple but strong bot: finish > capture > escape yard > advance. */
export function botMove(state: GameState, rules: RulesConfig = DEFAULT_RULES): number | null {
  const options = legalTokens(state, state.dice ?? 0, rules);
  if (options.length === 0) return null;
  if (options.length === 1) return options[0];

  const player = currentPlayer(state);
  const dice = state.dice ?? 0;
  let best: { id: number; score: number } | null = null;

  for (const id of options) {
    const token = player.tokens.find((t) => t.id === id)!;
    const to = targetProgress(state, player, token, dice, rules)!;
    let score = to;

    if (to === HOME) score += 1000;
    else if (to >= RING_LAST + 1) score += 300;
    else if (token.progress === YARD) score += 120;

    if (onRing(to) && !isSafe(toAbsolute(player.color, to))) {
      const abs = toAbsolute(player.color, to);
      const threat = state.players.some(
        (p) =>
          p.id !== player.id &&
          p.tokens.some(
            (t) => onRing(t.progress) && toAbsolute(p.color, t.progress) === abs,
          ),
      );
      if (threat) score += 250;
    }

    if (onRing(to) && isSafe(toAbsolute(player.color, to))) score += 40;

    if (!best || score > best.score) best = { id, score };
  }
  return best?.id ?? options[0];
}

/** Compact fingerprint of a finished match, stored alongside results. */
export function replayLog(state: GameState): string {
  return state.log
    .map((e) =>
      e.type === "roll"
        ? `r${e.playerId}:${e.value}`
        : e.type === "move"
          ? `m${e.playerId}:${e.tokenId}:${e.from}>${e.to}${e.captured?.length ? `x${e.captured.join(",")}` : ""}`
          : e.type === "finish"
            ? `f${e.playerId}:${e.rank}`
            : `p${e.playerId}`,
    )
    .join("|");
}
