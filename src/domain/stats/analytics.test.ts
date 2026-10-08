import { describe, expect, it } from "vitest";
import {
  augmentStats,
  bucketStats,
  decisionHindsightStats,
  decisionTypeStats,
  mistakeWindowCounts,
  openingPlanCoverage,
  reviewCoverage,
  type DecisionForStats,
  type ValueBucket,
} from "./analytics";
import type { MatchForStats } from "./stats";

const m = (over: Partial<MatchForStats> & { id: string; playedAt: string; placement: number }): MatchForStats => ({
  composition: undefined,
  primaryMistake: undefined,
  ...over,
});

const match = (id: string, placement: number, over: Partial<MatchForStats> = {}): MatchForStats =>
  m({ id, playedAt: `2026-02-${String(10 + (Number(id) % 9)).padStart(2, "0")}T13:00`, placement, ...over });

describe("openingPlanCoverage", () => {
  it("is null-rate on an empty history", () => {
    expect(openingPlanCoverage([])).toEqual({ total: 0, marked: 0, unmarked: 0, rate: null });
  });

  it("counts marked and unmarked over every match", () => {
    const matches = [
      match("1", 1, { openingPlan: "WIN_STREAK" }),
      match("2", 5, { openingPlan: "FORCE" }),
      match("3", 8),
    ];
    const c = openingPlanCoverage(matches);
    expect(c).toEqual({ total: 3, marked: 2, unmarked: 1, rate: 2 / 3 });
  });
});

describe("reviewCoverage", () => {
  const complete = {
    primaryMistake: "ECONOMY" as const,
    biggestMistake: "x",
    bestDecision: "y",
    nextGameFocus: "z",
  };

  it("separates the reviewed flag from the completeness rule", () => {
    const matches = [match("1", 1, { reviewed: true }), match("2", 5, { reviewed: true }), match("3", 8)];
    const reviews = [
      { matchId: "1", ...complete },
      { matchId: "2", nextGameFocus: "only seeded" },
    ];
    const c = reviewCoverage(matches, reviews);
    // both flags are set, but only one review actually satisfies the rule
    expect(c).toMatchObject({ total: 3, marked: 2, complete: 1, reviewedCompleteGap: 1 });
  });

  it("reports no gap while the write path is the only writer", () => {
    const matches = [match("1", 1, { reviewed: true })];
    expect(reviewCoverage(matches, [{ matchId: "1", ...complete }]).reviewedCompleteGap).toBe(0);
  });
});

const decisions: DecisionForStats[] = [
  { matchId: "1", type: "LEVELING", hindsight: "correct" },
  { matchId: "1", type: "ROLLING", hindsight: "correct" },
  { matchId: "1", type: "LEVELING", hindsight: "wrong" }, // same match, same type twice
  { matchId: "2", type: "LEVELING", hindsight: "wrong" },
  { matchId: "3", type: "UNKNOWN_TYPE" },
  { matchId: "ghost", type: "ECONOMY" }, // orphan decision
];

describe("decisionTypeStats", () => {
  it("deduplicates a match inside one type and ignores orphans", () => {
    const matches = [match("1", 1), match("2", 8), match("3", 4)];
    const rows = decisionTypeStats(matches, decisions);
    const leveling = rows.find((r) => r.key === "LEVELING")!;
    // match 1 held two LEVELING decisions but counts once
    expect(leveling.matches).toBe(2);
    expect(leveling.avgPlacement).toBe(4.5); // (1 + 8) / 2
    expect(rows.find((r) => r.key === "ROLLING")?.matches).toBe(1);
    // the decision pointing at a match that does not exist is dropped
    expect(rows.find((r) => r.key === "ECONOMY")).toBeUndefined();
  });

  it("keeps an unknown type visible instead of crashing", () => {
    const rows = decisionTypeStats([match("3", 4)], decisions);
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ key: "UNKNOWN_TYPE", matches: 1 });
  });

  it("returns nothing when there are no decisions", () => {
    expect(decisionTypeStats([match("1", 1)], [])).toEqual([]);
  });
});

describe("decisionHindsightStats", () => {
  it("groups by the verdict, one match in several rows", () => {
    const matches = [match("1", 1), match("2", 8)];
    const rows = decisionHindsightStats(matches, decisions);
    // match 1 has both a correct and a wrong call
    expect(rows.find((r) => r.key === "correct")?.matches).toBe(1);
    expect(rows.find((r) => r.key === "wrong")?.matches).toBe(2);
  });

  it("leaves out decisions without a verdict", () => {
    const rows = decisionHindsightStats([match("3", 4)], decisions);
    expect(rows).toEqual([]);
  });
});

describe("augmentStats", () => {
  it("counts a match once per unique augment", () => {
    const matches = [
      match("1", 1, { augmentIds: ["AUG_A", "AUG_B", "AUG_A"] }),
      match("2", 8, { augmentIds: ["AUG_A"] }),
    ];
    const rows = augmentStats(matches);
    expect(rows.find((r) => r.key === "AUG_A")).toMatchObject({ matches: 2, avgPlacement: 4.5 });
    expect(rows.find((r) => r.key === "AUG_B")?.matches).toBe(1);
  });

  it("keeps an unknown id as its own row", () => {
    const rows = augmentStats([match("1", 3, { augmentIds: ["DA_18_NotReal"] })]);
    expect(rows).toHaveLength(1);
    expect(rows[0].key).toBe("DA_18_NotReal");
  });

  it("ignores matches without augments and empty id strings", () => {
    expect(augmentStats([match("1", 3), match("2", 5, { augmentIds: [""] })])).toEqual([]);
  });
});

describe("mistakeWindowCounts", () => {
  it("splits the newest window against the one before it", () => {
    const matches = [
      // newest 10: ECONOMY x3, ROLLING x1, unmarked x6
      ...Array.from({ length: 3 }, (_, i) => match(`n${i}`, 4, { primaryMistake: "ECONOMY" })),
      match("n9", 4, { primaryMistake: "ROLLING" }),
      ...Array.from({ length: 6 }, (_, i) => match(`n${10 + i}`, 4)),
      // previous 10: ECONOMY x1, POSITIONING x2, unmarked x7
      match("p0", 4, { primaryMistake: "ECONOMY" }),
      ...Array.from({ length: 2 }, (_, i) => match(`p${1 + i}`, 4, { primaryMistake: "POSITIONING" })),
      ...Array.from({ length: 7 }, (_, i) => match(`p${3 + i}`, 4)),
    ];
    const rows = mistakeWindowCounts(matches, 10);
    const econ = rows.find((r) => r.key === "ECONOMY")!;
    expect(econ).toMatchObject({ recent: 3, previous: 1 });
    const unmarked = rows.find((r) => r.key === "UNCLASSIFIED")!;
    expect(unmarked).toMatchObject({ recent: 6, previous: 7 });
  });

  it("counts games beyond two windows not at all", () => {
    const matches = [
      ...Array.from({ length: 15 }, (_, i) => match(`a${i}`, 4, { primaryMistake: "ECONOMY" })),
      ...Array.from({ length: 15 }, (_, i) => match(`b${i}`, 4, { primaryMistake: "ITEM" })),
    ];
    const rows = mistakeWindowCounts(matches, 10);
    // only the last 20 games are in either window
    expect(rows.find((r) => r.key === "ECONOMY")).toMatchObject({ recent: 10, previous: 5 });
    expect(rows.find((r) => r.key === "ITEM")).toMatchObject({ recent: 0, previous: 5 });
  });

  it("returns nothing on an empty history", () => {
    expect(mistakeWindowCounts([], 10)).toEqual([]);
  });
});

const BUCKETS: ValueBucket[] = [
  { key: "low", label: "低", max: 30 },
  { key: "high", label: "高", min: 30 },
];

describe("bucketStats", () => {
  it("reports coverage separately from the buckets", () => {
    const matches = [match("1", 1, { finalHealth: 10 }), match("2", 5), match("3", 8, { finalHealth: 70 })];
    const b = bucketStats(matches, (x) => x.finalHealth, BUCKETS);
    expect(b.filled).toBe(2);
    expect(b.total).toBe(3);
  });

  it("places values on the lower-inclusive boundary into the upper band", () => {
    const matches = [match("1", 1, { finalHealth: 30 })];
    const b = bucketStats(matches, (x) => x.finalHealth, BUCKETS);
    expect(b.rows.find((r) => r.key === "low")!.matches).toBe(0);
    expect(b.rows.find((r) => r.key === "high")!.matches).toBe(1);
  });

  it("treats zero as a real value, not as missing", () => {
    const b = bucketStats([match("1", 1, { totalGold: 0 })], (x) => x.totalGold, [
      { key: "spent", label: "花光", max: 10 },
      { key: "kept", label: "存钱", min: 10 },
    ]);
    expect(b.filled).toBe(1);
    expect(b.rows.find((r) => r.key === "spent")!.matches).toBe(1);
  });

  it("drops a value inside a gap between declared bands instead of inventing a row", () => {
    // A gap means the declaration is wrong; the value must not silently land
    // in the nearest band.
    const gapped: ValueBucket[] = [
      { key: "low", label: "低", max: 30 },
      { key: "mid", label: "中", min: 40, max: 50 },
    ];
    const b = bucketStats([match("1", 1, { finalHealth: 35 })], (x) => x.finalHealth, gapped);
    expect(b.filled).toBe(1);
    expect(b.rows.every((r) => r.matches === 0)).toBe(true);
  });

  it("lets an unbounded top band absorb everything above it", () => {
    const b = bucketStats([match("1", 1, { finalHealth: 500 })], (x) => x.finalHealth, BUCKETS);
    expect(b.rows.find((r) => r.key === "high")!.matches).toBe(1);
  });

  it("keeps every bucket row present even when empty", () => {
    const b = bucketStats([match("1", 1, { finalHealth: 10 })], (x) => x.finalHealth, BUCKETS);
    expect(b.rows.map((r) => r.key)).toEqual(["low", "high"]);
    expect(b.rows[1].avgPlacement).toBeNull();
  });
});

describe("aggregation purity", () => {
  it("does not mutate the matches it reads", () => {
    const matches = [
      match("1", 1, { openingPlan: "FORCE", augmentIds: ["A"], primaryMistake: "ITEM", finalHealth: 20 }),
      match("2", 5, { augmentIds: ["A", "A"] }),
    ];
    const frozen = JSON.stringify(matches);
    const ds: DecisionForStats[] = [{ matchId: "1", type: "LEVELING", hindsight: "correct" }];
    openingPlanCoverage(matches);
    reviewCoverage(matches, [{ matchId: "1" }]);
    decisionTypeStats(matches, ds);
    decisionHindsightStats(matches, ds);
    augmentStats(matches);
    mistakeWindowCounts(matches, 10);
    bucketStats(matches, (x) => x.finalHealth, BUCKETS);
    expect(JSON.stringify(matches)).toBe(frozen);
  });
});
