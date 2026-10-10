import { describe, expect, it } from "vitest";
import {
  compareRecentWindows,
  compositionStats,
  formatRate,
  lastWindow,
  mistakeCounts,
  mostCommonMistakes,
  openingPlanStats,
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

  it("carries each game's own composition, normalized, or undefined when blank", () => {
    const matches = [
      m({ id: "a", playedAt: "2026-02-01T13:00", placement: 5, composition: " 森林  95 " }),
      m({ id: "b", playedAt: "2026-02-02T13:00", placement: 6, composition: "   " }),
      m({ id: "c", playedAt: "2026-02-03T13:00", placement: 1 }),
    ];
    const series = placementTrendSeries(matches, 20);
    expect(series.map((p) => p.composition)).toEqual(["森林 95", undefined, undefined]);
  });
});

describe("compareRecentWindows", () => {
  /** Newest → oldest: 20 games so both halves of a 10-window are full. */
  const build = (placements: number[]) =>
    placements.map((placement, i) =>
      m({ id: `m${i}`, playedAt: `2026-02-${String(20 - i).padStart(2, "0")}T13:00`, placement }),
    );

  it("reports no change until both windows are full", () => {
    const half = build([1, 2, 3, 4, 5, 6, 7, 8, 1, 2]);
    const c = compareRecentWindows(half, 5);
    expect(c.recent.games).toBe(5);
    expect(c.previous.games).toBe(5);
    // 10 games fill 2 × 5 — but `deltaAvg` also needs the *second* window full
    expect(c.deltaAvg).not.toBeNull();

    const three = build([1, 2, 3]);
    expect(compareRecentWindows(three, 5).deltaAvg).toBeNull();
  });

  it("is negative when the placement number drops (the player improved)", () => {
    // newest 10 average 3, the 10 before them average 5
    const matches = build([...Array(10).fill(3), ...Array(10).fill(5)]);
    const c = compareRecentWindows(matches, 10);
    expect(c.recent.avgPlacement).toBe(3);
    expect(c.previous.avgPlacement).toBe(5);
    expect(c.deltaAvg).toBe(-2);
  });

  it("is positive when the placement number climbs", () => {
    const matches = build([...Array(10).fill(6), ...Array(10).fill(2)]);
    expect(compareRecentWindows(matches, 10).deltaAvg).toBe(4);
  });

  it("reports zero for an unchanged window instead of null", () => {
    const matches = build(Array(20).fill(4));
    expect(compareRecentWindows(matches, 10).deltaAvg).toBe(0);
  });

  it("carries the Top4 numerator with the rate", () => {
    const matches = build([...Array(10).fill(2), ...Array(10).fill(8)]);
    const c = compareRecentWindows(matches, 10);
    expect(c.recent.top4Rate).toBe(1);
    expect(c.recent.top4).toBe(10);
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

describe("openingPlanStats", () => {
  it("groups by the marked route and leaves unmarked games out", () => {
    const matches = [
      m({ id: "1", playedAt: "2026-02-01T13:00", placement: 1, openingPlan: "WIN_STREAK" }),
      m({ id: "2", playedAt: "2026-02-02T13:00", placement: 5, openingPlan: "WIN_STREAK" }),
      m({ id: "3", playedAt: "2026-02-03T13:00", placement: 8, openingPlan: "FORCE" }),
      m({ id: "4", playedAt: "2026-02-04T13:00", placement: 2 }), // no plan marked
    ];
    const stats = openingPlanStats(matches);
    expect(stats).toHaveLength(2);
    expect(stats[0]).toMatchObject({ plan: "WIN_STREAK", games: 2, avgPlacement: 3, top4Rate: 0.5 });
    expect(stats[1]).toMatchObject({ plan: "FORCE", games: 1 });
    // coverage is the caller's job: unmarked games are not a row of their own
    expect(stats.find((s) => s.plan === "STANDARD")).toBeUndefined();
  });

  it("returns nothing when no route has ever been marked", () => {
    expect(openingPlanStats([m({ id: "1", playedAt: "2026-02-01T13:00", placement: 4 })])).toEqual([]);
  });
});

describe("timeSlotStats", () => {
  it("buckets games into two-hour slots across the whole day", () => {
    const matches = [
      m({ id: "1", playedAt: "2026-02-01T00:30", placement: 4 }),
      m({ id: "2", playedAt: "2026-02-01T12:30", placement: 4 }),
      m({ id: "3", playedAt: "2026-02-01T15:10", placement: 2 }),
      m({ id: "4", playedAt: "2026-02-01T20:55", placement: 5 }),
      m({ id: "5", playedAt: "2026-02-02T23:30", placement: 3 }),
      m({ id: "6", playedAt: "2026-02-02", placement: 3 }), // date only → "off"
    ];
    const stats = timeSlotStats(matches);
    const byKey = Object.fromEntries(stats.map((s) => [s.key, s]));
    expect(byKey["00-02"].games).toBe(1);
    expect(byKey["12-14"].games).toBe(1);
    expect(byKey["14-16"].games).toBe(1);
    expect(byKey["20-22"].games).toBe(1);
    expect(byKey["22-24"].games).toBe(1);
    // a game at 23:30 is a normal late-night game, not "outside" anything
    expect(byKey["off"].games).toBe(1);
    expect(byKey["off"].label).toBe("未填时间");
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
