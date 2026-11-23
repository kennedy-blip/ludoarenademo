import { describe, expect, it } from "vitest";
import { applyRating, expectedScore, rankFor, rankProgress } from "./rating";
import {
  dailyBonus,
  nextStreakValue,
  prizePoolFor,
  settleMatch,
  tournamentPoints,
} from "./economy";
import { createGame } from "./engine/game";
import type { PlayerSeed } from "./engine/types";

describe("rating", () => {
  it("gives equal players a 50/50 expectation", () => {
    expect(expectedScore(1000, 1000)).toBeCloseTo(0.5);
  });

  it("rewards beating a stronger opponent more", () => {
    const strong = applyRating(1000, 1, 2, [1400]);
    const weak = applyRating(1000, 1, 2, [800]);
    expect(strong.delta).toBeGreaterThan(weak.delta);
  });

  it("damps gains against bots", () => {
    const human = applyRating(1000, 1, 2, [1000], false);
    const bots = applyRating(1000, 1, 2, [1000], true);
    expect(Math.abs(bots.delta)).toBeLessThan(Math.abs(human.delta));
  });

  it("never drops below 100", () => {
    let r = 1000;
    for (let i = 0; i < 200; i++) r = applyRating(r, 4, 4, [1600, 1600, 1600]).rating;
    expect(r).toBeGreaterThanOrEqual(100);
  });

  it("maps ratings to ranks monotonically", () => {
    const order = [900, 1150, 1300, 1450, 1700].map((r) => rankFor(r).id);
    expect(new Set(order).size).toBe(5);
    expect(rankProgress(1000)).toBeGreaterThan(0);
    expect(rankProgress(1700)).toBe(1);
  });
});

describe("economy", () => {
  it("applies a 10% rake", () => {
    expect(prizePoolFor(100, 4)).toBe(360);
  });

  it("ramps the daily bonus and caps it", () => {
    expect(dailyBonus(1)).toBe(20);
    expect(dailyBonus(2)).toBe(30);
    expect(dailyBonus(9)).toBe(100);
    expect(dailyBonus(30)).toBe(100);
  });

  it("detects a same-day claim and a broken streak", () => {
    const now = new Date("2026-05-10T09:00:00Z");
    expect(nextStreakValue(3, "2026-05-10T01:00:00Z", now).claimed).toBe(false);
    expect(nextStreakValue(3, "2026-05-09T01:00:00Z", now)).toMatchObject({
      streak: 4,
      claimed: true,
    });
    expect(nextStreakValue(7, "2026-05-01T01:00:00Z", now)).toMatchObject({
      streak: 1,
      claimed: true,
    });
  });

  it("pays more for higher placements and beast matches", () => {
    expect(tournamentPoints(1, 4, 2, "free")).toBeGreaterThan(
      tournamentPoints(4, 4, 2, "free"),
    );
    expect(tournamentPoints(1, 4, 0, "beast")).toBe(
      tournamentPoints(1, 4, 0, "free") * 2,
    );
  });

  it("settles a real finished match deterministically", () => {
    const seeds: PlayerSeed[] = [
      { id: "p1", name: "You", color: "red" },
      { id: "p2", name: "Bot", color: "green", isBot: true },
    ];
    const g = createGame(seeds, { seed: 11, mode: "beast", entryFee: 100 });
    const finished = {
      ...g,
      phase: "finished" as const,
      rankings: ["p1", "p2"],
    };
    const ratings = { p1: 1000, p2: 1000 };
    const a = settleMatch(finished, ratings);
    const b = settleMatch(finished, ratings);
    expect(a.ratingChanges.p1.delta).toBeGreaterThan(0);
    expect(a.ratingChanges.p2.delta).toBeLessThan(0);
    expect(a.hash).toBe(b.hash);
    expect(a.tournamentPoints.p1).toBeGreaterThan(0);
  });
});
