import { describe, expect, it } from "vitest";
import {
  compositionStats,
  formatRate,
  lastWindow,
  mistakeCounts,
  mostCommonMistakes,
  overallStats,
  placementTrendSeries,
  recentWindowStats,
  timeSlotStats,
  trainingStreak,
} from "./stats";
import type { MatchForStats } from "./stats";

const m = (over: Partial<MatchForStats> & { id: string; playedAt: string; placement: number }): MatchForStats => ({
  composition: undefined,
  primaryMistake: undefined,
  ...over,
});

describe("overallStats (spec example: placements 8, 4, 3, 1)", () => {
  const matches = [m({ id: "1", playedAt: "2026-02-01T13:00", placement: 8 }),
    m({ id: "2", playedAt: "2026-02-01T19:00", placement: 4 }),
    m({ id: "3", playedAt: "2026-02-02T13:00", placement: 3 }),
    m({ id: "4", playedAt: "2026-02-02T19:00", placement: 1 })];

  it("computes average, top4, win and bottom4 rates", () => {
    const s = overallStats(matches);
    expect(s.games).toBe(4);
    expect(s.avgPlacement).toBe(4); // (8+4+3+1)/4
    expect(s.top4Rate).toBeCloseTo(0.75); // 3 of 4
    expect(s.winRate).toBeCloseTo(0.25); // 1 of 4
    expect(s.bottom4Rate).toBeCloseTo(0.25); // 1 of 4
  });

  it("reports — for an empty dataset", () => {
    const s = overallStats([]);
    expect(s.games).toBe(0);
    expect(s.avgPlacement).toBeNull();
    expect(formatRate(s.top4Rate)).toBe("—");
  });
});

describe("recentWindowStats", () => {
  const matches = [
    m({ id: "1", playedAt: "2026-02-10T13:00", placement: 8 }),
    m({ id: "2", playedAt: "2026-02-11T13:00", placement: 7 }),
    m({ id: "3", playedAt: "2026-02-12T13:00", placement: 2 }),
    m({ id: "4", playedAt: "2026-02-13T13:00", placement: 3 }),
  ];

  it("uses the most recent games only", () => {
    const last10 = recentWindowStats(matches, 10);
    expect(last10.games).toBe(4);
    expect(last10.avgPlacement).toBe(5); // (8+7+2+3)/4
    const last2 = recentWindowStats(matches, 2);
    expect(last2.games).toBe(2);
    expect(last2.top4Rate).toBe(1);
  });

  it("asks for fewer games than exist in a window", () => {
    expect(lastWindow(matches, 100).length).toBe(4);
  });
});

describe("placementTrendSeries", () => {
  it("returns oldest → newest within the limit", () => {
    const matches = [
      m({ id: "c", playedAt: "2026-02-03T13:00", placement: 1 }),
      m({ id: "b", playedAt: "2026-02-02T13:00", placement: 6 }),
      m({ id: "a", playedAt: "2026-02-01T13:00", placement: 5 }),
    ];
    const series = placementTrendSeries(matches, 20);
    expect(series.map((p) => p.id)).toEqual(["a", "b", "c"]);
    expect(series[2].top4).toBe(1);
    expect(placementTrendSeries(matches, 2).map((p) => p.id)).toEqual(["b", "c"]);
  });
});

describe("mistakeCounts", () => {
  it("counts each type and treats missing mistakes as UNCLASSIFIED", () => {
    const matches = [
      m({ id: "1", playedAt: "2026-02-01T13:00", placement: 5, primaryMistake: "ECONOMY" }),
      m({ id: "2", playedAt: "2026-02-01T19:00", placement: 6, primaryMistake: "ECONOMY" }),
      m({ id: "3", playedAt: "2026-02-02T13:00", placement: 4, primaryMistake: "ROLLING" }),
      m({ id: "4", playedAt: "2026-02-02T19:00", placement: 7 }),
    ];
    const counts = mistakeCounts(matches);
    expect(counts[0]).toEqual({ type: "ECONOMY", count: 2 });
    expect(mostCommonMistakes(matches, 2).map((c) => c.type)).toEqual(["ECONOMY", "ROLLING"]);
    expect(counts.find((c) => c.type === "UNCLASSIFIED")?.count).toBe(1);
  });

  it("returns nothing when there is nothing to count", () => {
    expect(mistakeCounts([])).toEqual([]);
  });
});

describe("compositionStats", () => {
  it("groups by trimmed composition name", () => {
    const matches = [
      m({ id: "1", playedAt: "2026-02-01T13:00", placement: 1, composition: "Arcader" }),
      m({ id: "2", playedAt: "2026-02-02T13:00", placement: 5, composition: "  Arcader " }),
      m({ id: "3", playedAt: "2026-02-03T13:00", placement: 3, composition: "Rebel" }),
      m({ id: "4", playedAt: "2026-02-04T13:00", placement: 8 }),
    ];
    const stats = compositionStats(matches);
    expect(stats[0]).toMatchObject({ composition: "Arcader", games: 2, avgPlacement: 3, top4Rate: 0.5 });
    expect(stats[1]).toMatchObject({ composition: "Rebel", games: 1, avgPlacement: 3 });
    // the record without a composition never appears
    expect(stats.find((c) => c.composition === undefined)).toBeUndefined();
  });
});

describe("timeSlotStats", () => {
  it("buckets games into the two-hour server windows", () => {
    const matches = [
      m({ id: "1", playedAt: "2026-02-01T12:30", placement: 4 }),
      m({ id: "2", playedAt: "2026-02-01T15:10", placement: 2 }),
      m({ id: "3", playedAt: "2026-02-01T20:55", placement: 5 }),
      m({ id: "4", playedAt: "2026-02-02T23:30", placement: 3 }),
      m({ id: "5", playedAt: "2026-02-02", placement: 3 }), // date only → outside bucket
    ];
    const stats = timeSlotStats(matches);
    const byKey = Object.fromEntries(stats.map((s) => [s.key, s]));
    expect(byKey["12-14"].games).toBe(1);
    expect(byKey["14-16"].games).toBe(1);
    expect(byKey["20-22"].games).toBe(1);
    expect(byKey["off"].games).toBe(2);
    expect(byKey["off"].label).toBe("训练时段外");
    // top4 rate inside a bucket
    expect(byKey["14-16"].top4Rate).toBe(1);
  });
});

describe("trainingStreak", () => {
  it("counts consecutive days ending today (or yesterday before the first game)", () => {
    const mk = (day: string, placement = 3) => [m({ id: day, playedAt: `${day}T13:00`, placement })];
    const today = "2026-03-10";
    expect(trainingStreak(mk(today), today)).toBe(1);
    expect(trainingStreak([...mk(today), ...mk("2026-03-09"), ...mk("2026-03-08")], today)).toBe(3);
    // no game today: the streak may still run through yesterday
    expect(trainingStreak([...mk("2026-03-09"), ...mk("2026-03-08")], today)).toBe(2);
    // a gap breaks it
    expect(trainingStreak([...mk("2026-03-09"), ...mk("2026-03-07")], today)).toBe(1);
    expect(trainingStreak([], today)).toBe(0);
  });
});
