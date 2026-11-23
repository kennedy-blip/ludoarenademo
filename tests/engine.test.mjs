// Engine parity tests. Run with: npm test
//
// These pin the behaviour that matters for money matches: dice determinism,
// capture rules, safe squares, exact finish, bonus rolls and full playthroughs.
// Mirrors the TypeScript suite (27 cases) that shipped before the port.

import { test, describe } from "node:test";
import assert from "node:assert/strict";

import * as Game from "../src/engine/Game.mjs";
import * as Types from "../src/engine/Types.mjs";
import * as Rng from "../src/engine/Rng.mjs";
import * as Board from "../src/engine/Board.mjs";
import * as Verify from "../src/engine/Verify.mjs";

const R = Types.defaultRules;

const seeds2 = [
  { seedId: "p1", seedName: "You", seedColor: "Red", seedIsBot: false },
  { seedId: "p2", seedName: "Bot", seedColor: "Green", seedIsBot: true },
];

const seeds4 = [
  { seedId: "a", seedName: "A", seedColor: "Red", seedIsBot: false },
  { seedId: "b", seedName: "B", seedColor: "Green", seedIsBot: true },
  { seedId: "c", seedName: "C", seedColor: "Yellow", seedIsBot: true },
  { seedId: "d", seedName: "D", seedColor: "Blue", seedIsBot: true },
];

const faces = (seed, count) => {
  const out = [];
  let cursor = 0;
  for (let i = 0; i < count; i++) {
    const [face, next] = Rng.next(seed, cursor);
    out.push(face);
    cursor = next;
  }
  return out;
};

function playOut(state, maxSteps = 40000) {
  let s = state;
  for (let i = 0; i < maxSteps && s.phase !== "Finished"; i++) {
    if (s.phase === "AwaitingRoll") {
      s = Game.roll(s, R);
    } else {
      const id = Game.botMove(s, R);
      assert.notEqual(id, null, "awaiting_move with no legal move");
      s = Game.move(s, id, R)[0];
    }
  }
  return s;
}

describe("rng", () => {
  test("is deterministic for a seed", () => {
    assert.deepEqual(faces(42, 8), faces(42, 8));
  });

  test("different seeds diverge", () => {
    assert.notDeepEqual(faces(1, 12), faces(2, 12));
  });

  test("only produces 1..6", () => {
    for (const f of faces(7, 5000)) {
      assert.ok(f >= 1 && f <= 6, `face out of range: ${f}`);
    }
  });

  test("is roughly uniform over 12k rolls", () => {
    const counts = [0, 0, 0, 0, 0, 0, 0];
    let cursor = 0;
    for (let i = 0; i < 12000; i++) {
      const [face, next] = Rng.next(12345, cursor);
      counts[face]++;
      cursor = next;
    }
    for (let f = 1; f <= 6; f++) {
      assert.ok(counts[f] > 1700 && counts[f] < 2300, `face ${f} count ${counts[f]}`);
    }
  });

  test("is bit-identical to the legacy TypeScript oracle", () => {
    // Frozen reference implementation from web/src/lib/engine/rng.ts. Any drift
    // here would silently invalidate every match log recorded before the port.
    const oracle = (seed, cursor) => {
      let t = (seed + Math.imul(cursor + 1, 0x6d2b79f5)) >>> 0;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return Math.floor((((t ^ (t >>> 14)) >>> 0) / 4294967296) * 6) + 1;
    };
    for (const seed of [0, 1, 7, 42, 2024, 65535, 2147483647, 4294967295]) {
      for (let c = 0; c < 200; c++) {
        assert.equal(Rng.next(seed, c)[0], oracle(seed, c), `seed ${seed} cursor ${c}`);
      }
    }
  });

  test("hash is stable and collisions are unlikely", () => {
    assert.equal(Rng.hash("abc"), Rng.hash("abc"));
    assert.notEqual(Rng.hash("abc"), Rng.hash("abd"));
    assert.equal(Rng.hash("abc").length, 8);
  });
});

describe("board", () => {
  test("start offsets are 13 apart", () => {
    assert.equal(Board.startOffset("Red"), 0);
    assert.equal(Board.startOffset("Green"), 13);
    assert.equal(Board.startOffset("Yellow"), 26);
    assert.equal(Board.startOffset("Blue"), 39);
  });

  test("absolute positions wrap at 52", () => {
    assert.equal(Board.toAbsolute("Blue", 13), 0);
    assert.equal(Board.toAbsolute("Yellow", 40), 14);
  });

  test("safe squares are known", () => {
    assert.equal(Board.isSafe(0), true);
    assert.equal(Board.isSafe(8), true);
    assert.equal(Board.isSafe(5), false);
    assert.equal(Board.isSafe(52), true); // wraps back to 0
  });

  test("every token has a drawable coordinate", () => {
    for (const color of ["Red", "Green", "Yellow", "Blue"]) {
      for (const progress of [-1, 0, 25, 51, 52, 56, 57]) {
        const [r, c] = Board.tokenCoord(color, progress, 0);
        assert.ok(r >= 0 && r < 15 && c >= 0 && c < 15, `${color}@${progress} => ${r},${c}`);
      }
    }
  });
});

describe("create", () => {
  test("rejects illegal player counts", () => {
    assert.throws(() => Game.create([seeds2[0]], 1, "Free", 0));
    assert.throws(() => Game.create([...seeds4, ...seeds4], 1, "Free", 0));
  });

  test("starts every token in the yard", () => {
    const g = Game.create(seeds2, 3, "Free", 0);
    assert.ok(g.players.flatMap((p) => p.tokens).every((t) => t.progress === -1));
    assert.equal(g.phase, "AwaitingRoll");
  });

  test("takes a 10% rake in beast mode", () => {
    const g = Game.create(seeds2, 3, "Beast", 100);
    assert.equal(g.prizePool, 180);
  });
});

describe("roll", () => {
  test("produces a moveable dice or advances the turn", () => {
    // A roll either leaves a dice waiting to be moved, or (when nothing can
    // move) passes the turn. Both are valid; the log must record a roll either
    // way, with a face in range.
    const g = Game.roll(Game.create(seeds2, 1, "Free", 0), R);
    const rolled = g.log.find((e) => e.TAG === "Roll");
    assert.ok(rolled.value >= 1 && rolled.value <= 6, `face ${rolled.value}`);
    if (g.phase === "AwaitingMove") {
      assert.ok(g.dice >= 1 && g.dice <= 6);
    } else {
      assert.equal(g.phase, "AwaitingRoll");
      assert.equal(g.dice, undefined);
    }
  });

  test("cannot be rolled twice without moving", () => {
    let g = Game.create(seeds2, 1, "Free", 0);
    for (let i = 0; i < 40 && g.phase !== "AwaitingMove"; i++) g = Game.roll(g, R);
    assert.equal(g.phase, "AwaitingMove");
    const again = Game.roll(g, R);
    assert.equal(again.dice, g.dice);
    assert.equal(again.rngCursor, g.rngCursor);
  });

  test("only a six leaves the yard", () => {
    let g = Game.create(seeds2, 1, "Free", 0);
    for (let i = 0; i < 60 && g.phase !== "AwaitingMove"; i++) g = Game.roll(g, R);
    const legal = Game.legalTokens(g, g.dice, R);
    assert.equal(legal.length, g.dice === 6 ? 4 : 0);
  });
});

describe("move", () => {
  test("illegal moves leave state untouched", () => {
    // Force the state so the mover has nothing legal: a 3 with every token home.
    const base = Game.create(seeds2, 1, "Free", 0);
    const stuck = {
      ...base,
      dice: 3,
      phase: "AwaitingMove",
      players: base.players.map((p) => ({
        ...p,
        tokens: p.tokens.map((t) => ({ ...t, progress: 57 })),
      })),
    };
    const [after] = Game.move(stuck, 0, R);
    assert.equal(after, stuck);
  });

  test("cannot overshoot home with exact finish", () => {
    const g = Game.create(seeds2, 2, "Free", 0);
    const forced = {
      ...g,
      dice: 3,
      phase: "AwaitingMove",
      players: g.players.map((p, i) =>
        i === 0
          ? { ...p, tokens: p.tokens.map((t, j) => (j === 0 ? { ...t, progress: 55 } : t)) }
          : p,
      ),
    };
    assert.deepEqual(Game.legalTokens(forced, 3, R), []);
  });

  test("captures an opponent on an unsafe square", () => {
    const g = Game.create(seeds2, 2, "Free", 0);
    // Red at ring progress 4, Green parked on the same absolute square (44).
    const forced = {
      ...g,
      dice: 1,
      phase: "AwaitingMove",
      players: [
        { ...g.players[0], tokens: g.players[0].tokens.map((t, j) => (j === 0 ? { ...t, progress: 4 } : t)) },
        { ...g.players[1], tokens: g.players[1].tokens.map((t, j) => (j === 0 ? { ...t, progress: 44 } : t)) },
      ],
    };
    const [after, captured] = Game.move(forced, 0, R);
    assert.deepEqual(captured, ["p2:0"]);
    assert.equal(after.players[1].tokens[0].progress, -1);
  });

  test("does not capture on a safe square", () => {
    const g = Game.create(seeds2, 2, "Free", 0);
    // absolute 8 is safe: Red from 7, Green parked on 47.
    const forced = {
      ...g,
      dice: 1,
      phase: "AwaitingMove",
      players: [
        { ...g.players[0], tokens: g.players[0].tokens.map((t, j) => (j === 0 ? { ...t, progress: 7 } : t)) },
        { ...g.players[1], tokens: g.players[1].tokens.map((t, j) => (j === 0 ? { ...t, progress: 47 } : t)) },
      ],
    };
    const [, captured] = Game.move(forced, 0, R);
    assert.deepEqual(captured, []);
  });

  test("capture grants another turn", () => {
    const g = Game.create(seeds2, 2, "Free", 0);
    const forced = {
      ...g,
      dice: 1,
      phase: "AwaitingMove",
      players: [
        { ...g.players[0], tokens: g.players[0].tokens.map((t, j) => (j === 0 ? { ...t, progress: 4 } : t)) },
        { ...g.players[1], tokens: g.players[1].tokens.map((t, j) => (j === 0 ? { ...t, progress: 44 } : t)) },
      ],
    };
    const [after] = Game.move(forced, 0, R);
    assert.equal(after.turn, 0);
    assert.equal(after.phase, "AwaitingRoll");
  });
});

describe("full matches", () => {
  test("two players reach a winner and rank both", () => {
    for (const seed of [1, 2, 3, 11, 99]) {
      const final = playOut(Game.create(seeds2, seed, "Free", 0));
      assert.equal(final.phase, "Finished", `seed ${seed} did not finish`);
      assert.equal(final.rankings.length, 2);
      const winner = final.players.find((p) => p.id === final.rankings[0]);
      assert.ok(winner.tokens.every((t) => t.progress === 57), "winner has all four home");
    }
  });

  test("four players finish and rank uniquely", () => {
    const final = playOut(Game.create(seeds4, 4321, "Free", 0), 120000);
    assert.equal(final.phase, "Finished");
    assert.equal(new Set(final.rankings).size, 4);
  });

  test("same seed replays identically", () => {
    const a = playOut(Game.create(seeds2, 77, "Free", 0));
    const b = playOut(Game.create(seeds2, 77, "Free", 0));
    assert.deepEqual(
      a.log.map((e) => JSON.stringify(e)),
      b.log.map((e) => JSON.stringify(e)),
    );
  });

  test("different seeds produce different matches", () => {
    const a = playOut(Game.create(seeds2, 5, "Free", 0));
    const b = playOut(Game.create(seeds2, 6, "Free", 0));
    assert.notDeepEqual(
      a.log.map((e) => JSON.stringify(e)),
      b.log.map((e) => JSON.stringify(e)),
    );
  });

  test("a finished match replays from its seed", () => {
    let g = Game.create(seeds2, 12345, "Free", 0);
    const choices = [];
    for (let i = 0; i < 50000 && g.phase !== "Finished"; i++) {
      if (g.phase === "AwaitingRoll") {
        g = Game.roll(g, R);
      } else {
        const id = Game.botMove(g, R);
        choices.push(id);
        g = Game.move(g, id, R)[0];
      }
    }
    assert.equal(g.phase, "Finished");
    assert.ok(choices.length > 50, "expected a long match");

    const [ok, expected, actual] = Verify.verify(g, choices);
    assert.ok(ok, `replay mismatch: ${expected} != ${actual}`);
    assert.equal(expected, actual);
  });

  test("a tampered move log is rejected", () => {
    let g = Game.create(seeds2, 999, "Free", 0);
    const choices = [];
    for (let i = 0; i < 50000 && g.phase !== "Finished"; i++) {
      if (g.phase === "AwaitingRoll") {
        g = Game.roll(g, R);
      } else {
        const id = Game.botMove(g, R);
        choices.push(id);
        g = Game.move(g, id, R)[0];
      }
    }
    const tampered = [...choices];
    tampered[tampered.length - 1] = (tampered[tampered.length - 1] + 1) % 4;
    const [ok] = Verify.verify(g, tampered);
    assert.equal(ok, false);
  });

  test("sixes never accumulate past three", () => {
    const final = playOut(Game.create(seeds2, 21, "Free", 0));
    assert.ok(final.consecutiveSixes <= 2);
  });
});
