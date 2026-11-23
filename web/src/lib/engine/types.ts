/** Core game types. Everything here is serialisable so a match can be stored
 *  in Postgres, replayed on the server, and verified byte-for-byte. */

export type PlayerColor = "red" | "green" | "yellow" | "blue";
export type GameMode = "free" | "beast";

/** -1 = in the yard, 0..51 = main ring, 52..56 = home column, 57 = home. */
export type Progress = number;

export const YARD = -1;
export const HOME = 57;
export const RING_LAST = 51;
export const RING_LENGTH = 52;

export interface TokenState {
  id: number;
  progress: Progress;
}

export interface PlayerState {
  id: string;
  name: string;
  color: PlayerColor;
  isBot: boolean;
  tokens: TokenState[];
  /** 1-based finishing position, or null while still playing. */
  finishedRank: number | null;
}

export type GameEvent =
  | { type: "roll"; playerId: string; value: number; at: number }
  | {
      type: "move";
      playerId: string;
      tokenId: number;
      from: Progress;
      to: Progress;
      captured?: string[];
      at: number;
    }
  | { type: "pass"; playerId: string; at: number }
  | { type: "finish"; playerId: string; rank: number; at: number };

export interface GameState {
  version: 1;
  mode: GameMode;
  /** 32-bit seed. Rolls are derived from it, so a replay is deterministic. */
  seed: number;
  /** Number of rolls consumed from the generator. */
  rngCursor: number;
  players: PlayerState[];
  turn: number;
  dice: number | null;
  phase: "awaiting_roll" | "awaiting_move" | "finished";
  consecutiveSixes: number;
  rankings: string[];
  entryFee: number;
  prizePool: number;
  log: GameEvent[];
  /** Monotonic counter used for log timestamps inside the engine. */
  tick: number;
}

export interface RulesConfig {
  /** Two same-colour tokens on a square block opponents (house rule). */
  blocking: boolean;
  /** Three consecutive sixes forfeits the turn. */
  threeSixBust: boolean;
  /** A six grants another roll. */
  sixRollsAgain: boolean;
  /** Capturing an opponent grants another roll. */
  captureRollsAgain: boolean;
  /** Exact roll required to reach home (no overshoot). */
  exactFinish: boolean;
}

export const DEFAULT_RULES: RulesConfig = {
  blocking: false,
  threeSixBust: true,
  sixRollsAgain: true,
  captureRollsAgain: true,
  exactFinish: true,
};

export interface PlayerSeed {
  id: string;
  name: string;
  color: PlayerColor;
  isBot?: boolean;
}
