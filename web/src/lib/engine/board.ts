import type { PlayerColor } from "./types";

/** Canonical Ludo track: 52 cells, four start squares 13 apart.
 *  Red starts the ring at 0, then green 13, yellow 26, blue 39. */
export const TRACK_LENGTH = 52;

export const START_OFFSET: Record<PlayerColor, number> = {
  red: 0,
  green: 13,
  yellow: 26,
  blue: 39,
};

/** Safe squares (start squares + star squares). Captures are illegal here. */
export const SAFE_SQUARES: readonly number[] = [0, 8, 13, 21, 26, 34, 39, 47];

export const COLOR_ORDER: readonly PlayerColor[] = [
  "red",
  "green",
  "yellow",
  "blue",
];

export function isSafe(absolute: number): boolean {
  return SAFE_SQUARES.includes(((absolute % TRACK_LENGTH) + TRACK_LENGTH) % TRACK_LENGTH);
}

/** Convert a player-relative ring progress into an absolute ring index. */
export function toAbsolute(color: PlayerColor, progress: number): number {
  return (START_OFFSET[color] + progress) % TRACK_LENGTH;
}

/** True while the token is on the shared ring (capture/block rules apply). */
export function onRing(progress: number): boolean {
  return progress >= 0 && progress <= 51;
}

/** 15x15 board coordinates for the 52 ring cells, in absolute order. */
export const RING_COORDS: readonly [number, number][] = [
  [6, 13], [6, 12], [6, 11], [6, 10], [6, 9],
  [5, 8], [4, 8], [3, 8], [2, 8], [1, 8], [0, 8],
  [0, 7], [0, 6],
  [1, 6], [2, 6], [3, 6], [4, 6], [5, 6],
  [6, 5], [6, 4], [6, 3], [6, 2], [6, 1], [6, 0],
  [7, 0], [8, 0],
  [8, 1], [8, 2], [8, 3], [8, 4], [8, 5],
  [9, 6], [10, 6], [11, 6], [12, 6], [13, 6], [14, 6],
  [14, 7], [14, 8],
  [13, 8], [12, 8], [11, 8], [10, 8], [9, 8],
  [8, 9], [8, 10], [8, 11], [8, 12], [8, 13], [8, 14],
  [7, 14], [6, 14],
];

export const HOME_COLUMN: Record<PlayerColor, readonly [number, number][]> = {
  red: [[7, 13], [7, 12], [7, 11], [7, 10], [7, 9]],
  green: [[1, 7], [2, 7], [3, 7], [4, 7], [5, 7]],
  yellow: [[7, 1], [7, 2], [7, 3], [7, 4], [7, 5]],
  blue: [[13, 7], [12, 7], [11, 7], [10, 7], [9, 7]],
};

export const YARD_COORDS: Record<PlayerColor, readonly [number, number][]> = {
  red: [[1, 11], [2, 11], [1, 12], [2, 12]],
  green: [[1, 1], [2, 1], [1, 2], [2, 2]],
  yellow: [[11, 1], [12, 1], [11, 2], [12, 2]],
  blue: [[11, 11], [12, 11], [11, 12], [12, 12]],
};

export const CENTER: [number, number] = [7, 7];

/** Where a token is drawn. */
export function tokenCoord(
  color: PlayerColor,
  progress: number,
  tokenId: number,
): [number, number] {
  if (progress < 0) return YARD_COORDS[color][tokenId] ?? YARD_COORDS[color][0];
  if (progress >= 57) return CENTER;
  if (progress >= 52) {
    const col = HOME_COLUMN[color];
    return col[Math.min(progress - 52, col.length - 1)];
  }
  return RING_COORDS[toAbsolute(color, progress)] ?? CENTER;
}
