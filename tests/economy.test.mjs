// Economy and progression rules. These are money rules, so they are pinned.
//
// Ported from web/src/lib/economy.test.ts and web/src/lib/rating.ts; the
// expected values are the ones that suite asserted, so a regression in the port
// shows up here rather than in someone's wallet.

import { test, describe } from "node:test";
import assert from "node:assert/strict";

import * as E from "../src/economy/Economy.mjs";

describe("prize pool", () => {
  test("applies a 10% rake", () => {
    assert.equal(E.prizePoolFor(100, 4), 360);
    assert.equal(E.prizePoolFor(100, 2), 180);
    assert.equal(E.prizePoolFor(1000, 4), 3600);
  });
});

describe("daily bonus", () => {
  test("ramps and caps at 100", () => {
    assert.equal(E.dailyBonus(1), 20);
    assert.equal(E.dailyBonus(2), 30);
    assert.equal(E.dailyBonus(9), 100);
    assert.equal(E.dailyBonus(30), 100);
  });

  // ReScript options cross into JS as `undefined` (None) or the bare value
  // (Some), which is why these pass a number rather than an option wrapper.
  test("detects a same-day claim", () => {
    assert.equal(E.nextStreak(3, 100, 100)[2], false);
  });

  test("extends on consecutive days", () => {
    const [streak, amount, claimed] = E.nextStreak(3, 101, 100);
    assert.equal(streak, 4);
    assert.equal(amount, 50);
    assert.equal(claimed, true);
  });

  test("resets a broken streak", () => {
    const [streak, amount, claimed] = E.nextStreak(7, 120, 100);
    assert.equal(streak, 1);
    assert.equal(amount, 20);
    assert.equal(claimed, true);
  });

  test("a first-ever claim starts at 1", () => {
    const [streak, amount, claimed] = E.nextStreak(0, 20000, undefined);
    assert.deepEqual([streak, amount, claimed], [1, 20, true]);
  });
});

describe("rating", () => {
  test("equal players expect a coin flip", () => {
    assert.ok(Math.abs(E.expectedScore(1000, 1000) - 0.5) < 1e-9);
  });

  test("beating a stronger opponent pays more", () => {
    const strong = E.applyRating(1000, 1, 2, 1200, false);
    const weak = E.applyRating(1000, 1, 2, 800, false);
    assert.ok(strong[1] > weak[1], `${strong[1]} vs ${weak[1]}`);
  });

  test("gains against bots are damped so farming is unprofitable", () => {
    const bots = E.applyRating(1000, 1, 2, 1000, true);
    const human = E.applyRating(1000, 1, 2, 1000, false);
    assert.ok(Math.abs(bots[1]) < Math.abs(human[1]));
  });

  test("rating never drops below 100", () => {
    assert.ok(E.applyRating(100, 4, 4, 2000, false)[0] >= 100);
    assert.ok(E.applyRating(0, 4, 4, 3000, false)[0] >= 100);
  });

  test("a win actually gains and a loss actually loses", () => {
    assert.ok(E.applyRating(1000, 1, 4, 1000, false)[1] > 0);
    assert.ok(E.applyRating(1000, 4, 4, 1000, false)[1] < 0);
  });
});

describe("ranks", () => {
  test("map ratings to ranks monotonically", () => {
    const at = (r) => E.rankFor(r).id;
    assert.equal(at(0), "mwanzo");
    assert.equal(at(1000), "mwanzo");
    assert.equal(at(1100), "shujaa");
    assert.equal(at(1250), "simba");
    assert.equal(at(1400), "mfalme");
    assert.equal(at(1700), "legend");
    const seen = new Set([0, 1100, 1250, 1400, 1600].map((r) => at(r)));
    assert.equal(seen.size, 5, "every rank is reachable");
  });

  test("progress runs 0..1", () => {
    assert.ok(E.rankProgress(1000) > 0);
    assert.equal(E.rankProgress(1700), 1.0);
    assert.equal(E.nextRank(1700), undefined);
  });
});

describe("tournament points", () => {
  test("pays more for higher placements", () => {
    const first = E.tournamentPoints(1, 4, 0, false);
    const last = E.tournamentPoints(4, 4, 0, false);
    assert.ok(first > last, `${first} vs ${last}`);
  });

  test("doubles in beast mode", () => {
    assert.equal(E.tournamentPoints(1, 4, 0, true), E.tournamentPoints(1, 4, 0, false) * 2);
  });

  test("captures add a capped bonus", () => {
    assert.ok(E.tournamentPoints(1, 4, 3, false) > E.tournamentPoints(1, 4, 0, false));
    assert.equal(E.tournamentPoints(1, 4, 20, false), E.tournamentPoints(1, 4, 8, false));
  });
});
