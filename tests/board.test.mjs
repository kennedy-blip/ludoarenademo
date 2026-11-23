// Board geometry: the invariants that stop tokens being drawn on the wrong
// square, or two tokens sharing one. Run with: npm test

import { test, describe } from "node:test";
import assert from "node:assert/strict";

import * as Game from "../src/engine/Game.mjs";
import * as Types from "../src/engine/Types.mjs";
import * as Board from "../src/engine/Board.mjs";

const COLORS = ["Red", "Green", "Yellow", "Blue"];
const key = (c) => c[0] + "," + c[1];

const seeds2 = [
  { seedId: "p1", seedName: "You", seedColor: "Red", seedIsBot: false },
  { seedId: "p2", seedName: "Bot 1", seedColor: "Green", seedIsBot: true },
];

describe("yards", () => {
  test("each colour has 4 distinct slots", () => {
    for (const color of COLORS) {
      const ys = Board.yardCoords(color);
      assert.equal(ys.length, 4);
      assert.equal(new Set(ys.map(key)).size, 4, `${color} slots collide`);
    }
  });

  test("slots sit inside their quadrant", () => {
    const quadrant = (color, r, c) =>
      ({
        Red: r >= 1 && r <= 2 && c >= 11 && c <= 12,
        Green: r >= 1 && r <= 2 && c >= 1 && c <= 2,
        Yellow: r >= 11 && r <= 12 && c >= 1 && c <= 2,
        Blue: r >= 11 && r <= 12 && c >= 11 && c <= 12,
      })[color];
    for (const color of COLORS) {
      for (const [r, c] of Board.yardCoords(color)) {
        assert.ok(quadrant(color, r, c), `${color} slot at ${r},${c} is outside its yard`);
      }
    }
  });
});

describe("ring", () => {
  test("has exactly 52 unique cells", () => {
    assert.equal(Board.ringCoords.length, 52);
    assert.equal(new Set(Board.ringCoords.map(key)).size, 52);
  });

  test("start squares are 13 apart", () => {
    assert.equal(Board.toAbsolute("Red", 0), 0);
    assert.equal(Board.toAbsolute("Green", 0), 13);
    assert.equal(Board.toAbsolute("Yellow", 0), 26);
    assert.equal(Board.toAbsolute("Blue", 0), 39);
  });

  test("every colour walks all 52 cells once", () => {
    for (const color of COLORS) {
      const seen = new Set();
      for (let p = 0; p <= 51; p++) {
        seen.add(key(Board.tokenCoord(color, p, 0)));
      }
      assert.equal(seen.size, 52, `${color} revisits a cell`);
    }
  });
});

describe("home columns", () => {
  test("are 5 cells, clear of the ring and the centre", () => {
    const ring = new Set(Board.ringCoords.map(key));
    for (const color of COLORS) {
      const col = Board.homeColumn(color);
      assert.equal(col.length, 5, `${color} column length`);
      for (const [r, c] of col) {
        assert.ok(!ring.has(r + "," + c), `${color} column overlaps the ring at ${r},${c}`);
        assert.ok(!(r === 7 && c === 7), `${color} column runs through the centre`);
      }
    }
  });

  test("progress 57 puts a token in the centre", () => {
    for (const color of COLORS) {
      const [r, c] = Board.tokenCoord(color, 57, 0);
      assert.deepEqual([r, c], [7, 7]);
    }
  });
});

describe("playthrough placement", () => {
  test("every token lands on the board after a full match", () => {
    let g = Game.create(seeds2, 4242, "Free", 0);
    for (let i = 0; i < 4000 && g.phase !== "Finished"; i++) {
      if (g.phase === "AwaitingRoll") {
        g = Game.roll(g, Types.defaultRules);
      } else {
        g = Game.move(g, Game.botMove(g, Types.defaultRules), Types.defaultRules)[0];
      }
    }
    assert.equal(g.phase, "Finished");
    for (const p of g.players) {
      for (const t of p.tokens) {
        const [r, c] = Board.tokenCoord(p.color, t.progress, t.id);
        assert.ok(r >= 0 && r <= 14 && c >= 0 && c <= 14, `token off-board at ${r},${c}`);
      }
    }
  });

  test("a token never leaves the -1..57 range", () => {
    let g = Game.create(seeds2, 31337, "Free", 0);
    for (let i = 0; i < 4000 && g.phase !== "Finished"; i++) {
      if (g.phase === "AwaitingRoll") {
        g = Game.roll(g, Types.defaultRules);
      } else {
        g = Game.move(g, Game.botMove(g, Types.defaultRules), Types.defaultRules)[0];
      }
      for (const p of g.players) {
        for (const t of p.tokens) {
          assert.ok(t.progress >= -1 && t.progress <= 57, `progress ${t.progress} out of range`);
        }
      }
    }
  });
});
