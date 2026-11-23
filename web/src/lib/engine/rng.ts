/** Deterministic, serialisable PRNG (mulberry32).
 *
 *  A match stores only `seed` + `cursor`, so the server can recompute every
 *  dice value a client reports. That is what makes result verification cheap:
 *  replay the log, compare hashes. */

export function nextRandom(seed: number, cursor: number): { value: number; cursor: number } {
  let t = (seed + Math.imul(cursor + 1, 0x6d2b79f5)) >>> 0;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  const unit = ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  const value = Math.floor(unit * 6) + 1;
  return { value, cursor: cursor + 1 };
}

/** FNV-1a hash — used to fingerprint a replay log for integrity checks. */
export function hashString(input: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h.toString(16).padStart(8, "0");
}

export function randomSeed(): number {
  if (typeof crypto !== "undefined" && "getRandomValues" in crypto) {
    return crypto.getRandomValues(new Uint32Array(1))[0] >>> 0;
  }
  return (Math.random() * 0xffffffff) >>> 0;
}
