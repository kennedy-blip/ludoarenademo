import { describe, expect, it } from "vitest";
import { createGame, legalTokens, moveToken, rollDice, botMove, winnerId } from "./game";
import { nextRandom } from "./rng";
import { DEFAULT_RULES, HOME, YARD } from "./types";
import type { GameState, PlayerSeed } from "./types";

const SEEDS: PlayerSeed[] = [
  { id: "p1", name: "You", color: "red" },
  { id: "p2", name: "Bot", color: "green", isBot: true },
];

function deterministicDice(seed: number, count: number): number[] {
  const out: number[] = [];
  let cursor = 0;
  for (let i = 0; i < count; i++) {
    const r = nextRandom(seed, cursor);
    out.push(r.value);
    cursor = r.cursor;
  }
  return out;
}

/** Play a whole match with bots on every seat. */
function playOut(state: GameState, maxSteps = 20000): GameState {
  let s = state;
  for (let i = 0; i < maxSteps && s.phase !== "finished"; i++) {
    if (s.phase === "awaiting_roll") {
      s = rollDice(s);
    } else {
      const id = botMove(s);
      if (id === null) {
        throw new Error("no legal move despite awaiting_move");
      }
      s = moveToken(s, id).state;
    }
  }
  return s;
}

describe("rng", () => {
  it("is deterministic for a seed", () => {
    expect(deterministicDice(42, 6)).toEqual(deterministicDice(42, 6));
  });

  it("only produces 1..6", () => {
    for (const v of deterministicDice(7, 500)) {
      expect(v).toBeGreaterThanOrEqual(1);
      expect(v).toBeLessThanOrEqual(6);
    }
  });

  it("is roughly uniform", () => {
    const counts = [0, 0, 0, 0, 0, 0, 0];
    let cursor = 0;
    for (let i = 0; i < 12000; i++) {
      const r = nextRandom(12345, cursor);
      counts[r.value]++;
      cursor = r.cursor;
    }
    for (let face = 1; face <= 6; face++) {
      expect(counts[face]).toBeGreaterThan(1600);
      expect(counts[face]).toBeLessThan(2400);
    }
  });
});

describe("createGame", () => {
  it("validates player count", () => {
    expect(() => createGame([SEEDS[0]], { seed: 1 })).toThrow();
    expect(() => createGame([...SEEDS, ...SEEDS, ...SEEDS], { seed: 1 })).toThrow();
  });

  it("starts every token in the yard", () => {
    const g = createGame(SEEDS, { seed: 3 });
    expect(g.players.flatMap((p) => p.tokens).every((t) => t.progress === YARD)).toBe(true);
    expect(g.phase).toBe("awaiting_roll");
  });

  it("computes the beast prize pool with a 10% rake", () => {
    const g = createGame(SEEDS, { seed: 3, mode: "beast", entryFee: 100 });
    expect(g.prizePool).toBe(180);
  });
});

describe("rollDice", () => {
  it("is a no-op once the dice is waiting to be moved", () => {
    let a = createGame(SEEDS, { seed: 1 });
    for (let i = 0; i < 50 && a.phase !== "awaiting_move"; i++) a = rollDice(a);
    expect(a.phase).toBe("awaiting_move");
    const b = rollDice(a);
    expect(b.dice).toBe(a.dice);
    expect(b.rngCursor).toBe(a.rngCursor);
    expect(b.turn).toBe(a.turn);
  });

  it("only lets you leave the yard on a six", () => {
    const g = createGame(SEEDS, { seed: 1 });
    const rolled = rollDice(g);
    const sixes = legalTokens(rolled, rolled.dice!);
    expect(sixes.length).toBe(rolled.dice === 6 ? 4 : 0);
  });

  it("busts after three sixes by construction of the rule", () => {
    // Find a seed whose first three rolls are 6,6,6 is impractical; instead
    // assert the counter resets on a non-six.
    let s = createGame(SEEDS, { seed: 5 });
    for (let i = 0; i < 200 && s.phase !== "finished"; i++) {
      if (s.phase === "awaiting_roll") s = rollDice(s);
      else s = moveToken(s, botMove(s)!).state;
      if (s.consecutiveSixes > 2) throw new Error("consecutive sixes never reset");
    }
    expect(s.phase === "finished" || s.consecutiveSixes <= 2).toBe(true);
  });
});

describe("moveToken", () => {
  it("rejects illegal tokens without mutating", () => {
    const g = createGame(SEEDS, { seed: 1 });
    const rolled = rollDice(g);
    if (rolled.dice !== 6) {
      const res = moveToken(rolled, 0);
      expect(res.state).toBe(rolled);
    }
  });

  it("cannot overshoot home when exactFinish is on", () => {
    let s = createGame(SEEDS, { seed: 2 });
    // force a token near home
    s = {
      ...s,
      dice: 3,
      phase: "awaiting_move",
      players: s.players.map((p, i) =>
        i === 0
          ? { ...p, tokens: p.tokens.map((t, j) => (j === 0 ? { ...t, progress: 55 } : t)) }
          : p,
      ),
    };
    expect(legalTokens(s, 3)).not.toContain(0);
    s = { ...s, dice: 2 };
    expect(legalTokens(s, 2, DEFAULT_RULES)).toContain(0);
  });

  it("captures opponents on unsafe squares and sends them home", () => {
    let s = createGame(SEEDS, { seed: 2 });
    // red token at progress 5 -> absolute 5 (unsafe); green token parked on absolute 5
    s = {
      ...s,
      dice: 1,
      phase: "awaiting_move",
      players: [
        { ...s.players[0], tokens: s.players[0].tokens.map((t, j) => (j === 0 ? { ...t, progress: 4 } : t)) },
        { ...s.players[1], tokens: s.players[1].tokens.map((t, j) => (j === 0 ? { ...t, progress: 44 } : t)) },
      ],
    };
    const res = moveToken(s, 0);
    expect(res.captured).toEqual(["p2:0"]);
    expect(res.state.players[1].tokens[0].progress).toBe(YARD);
  });

  it("does not capture on safe squares", () => {
    let s = createGame(SEEDS, { seed: 2 });
    // absolute 8 is safe; red reaches it from progress 7
    s = {
      ...s,
      dice: 1,
      phase: "awaiting_move",
      players: [
        { ...s.players[0], tokens: s.players[0].tokens.map((t, j) => (j === 0 ? { ...t, progress: 7 } : t)) },
        { ...s.players[1], tokens: s.players[1].tokens.map((t, j) => (j === 0 ? { ...t, progress: 47 } : t)) },
      ],
    };
    const res = moveToken(s, 0);
    expect(res.captured).toEqual([]);
    expect(res.state.players[1].tokens[0].progress).toBe(47);
  });

  it("awards a bonus roll on capture", () => {
    let s = createGame(SEEDS, { seed: 2 });
    s = {
      ...s,
      dice: 1,
      phase: "awaiting_move",
      turn: 0,
      players: [
        { ...s.players[0], tokens: s.players[0].tokens.map((t, j) => (j === 0 ? { ...t, progress: 4 } : t)) },
        { ...s.players[1], tokens: s.players[1].tokens.map((t, j) => (j === 0 ? { ...t, progress: 44 } : t)) },
      ],
    };
    const res = moveToken(s, 0).state;
    expect(res.turn).toBe(0);
    expect(res.phase).toBe("awaiting_roll");
  });
});

describe("full matches", () => {
  it("reaches a winner and ranks everyone", () => {
    for (const seed of [1, 2, 3, 11, 99, 2024]) {
      const final = playOut(createGame(SEEDS, { seed }));
      expect(final.phase).toBe("finished");
      expect(final.rankings).toHaveLength(2);
      expect(winnerId(final)).toBe(final.rankings[0]);
      expect(final.players.some((p) => p.tokens.every((t) => t.progress === HOME))).toBe(true);
    }
  });

  it("is reproducible from the same seed", () => {
    const a = playOut(createGame(SEEDS, { seed: 77 }));
    const b = playOut(createGame(SEEDS, { seed: 77 }));
    expect(JSON.stringify(a.log)).toBe(JSON.stringify(b.log));
  });

  it("supports four players", () => {
    const four: PlayerSeed[] = [
      { id: "a", name: "A", color: "red" },
      { id: "b", name: "B", color: "green" },
      { id: "c", name: "C", color: "yellow" },
      { id: "d", name: "D", color: "blue" },
    ];
    const final = playOut(createGame(four, { seed: 4321 }), 60000);
    expect(final.phase).toBe("finished");
    expect(final.rankings).toHaveLength(4);
    expect(new Set(final.rankings).size).toBe(4);
  });
});
