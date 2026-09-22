import { beforeEach, describe, expect, it } from "vitest";
import { RuleBasedSummary } from "../services/review-summary";
import { addGoal } from "../services/training-service";
import { resetDatabase } from "../test/db-helper";
import { dateKey, startOfWeek, wallClockNow } from "../lib/wallclock";

function thisWeek(dayOffset: number, hour = 13): string {
  const start = startOfWeek(wallClockNow());
  // day 0 = Monday
  const base = `${dateKey(start)}T${hour.toString().padStart(2, "0")}:00`;
  const d = new Date(`${dateKey(start)}T12:00`);
  d.setDate(d.getDate() + dayOffset);
  const p = (x: number) => x.toString().padStart(2, "0");
  void base;
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${hour.toString().padStart(2, "0")}:00`;
}

beforeEach(resetDatabase);

describe("RuleBasedSummary (no LLM)", () => {
  it("states plainly when there are no games", async () => {
    const s = await RuleBasedSummary.summarize({
      weekStart: "2026-09-14",
      weekEnd: "2026-09-20",
      games: 0,
      avgPlacement: null,
      top4Rate: null,
      wins: 0,
      bottom4: 0,
      mostCommonMistakes: [],
      topComposition: null,
      currentGoal: null,
    });
    expect(s.provider).toBe("rule-based");
    expect(s.points[0]).toContain("还没有记录对局");
    expect(s.nextStep).toBeNull();
  });

  it("suggests a goal when mistakes dominate and no goal is active", async () => {
    const s = await RuleBasedSummary.summarize({
      weekStart: "2026-09-14",
      weekEnd: "2026-09-20",
      games: 4,
      avgPlacement: 5.5,
      top4Rate: 0.25,
      wins: 0,
      bottom4: 3,
      mostCommonMistakes: [
        { type: "ECONOMY", label: "经济", count: 3 },
        { type: "UNCLASSIFIED", label: "未分类", count: 1 },
      ],
      topComposition: { composition: "Rebel", games: 3, avgPlacement: 6 },
      currentGoal: null,
    });
    expect(s.headline).toBeTruthy();
    expect(s.points.join(" ")).toContain("经济 × 3");
    expect(s.nextStep).toContain("经济");
  });

  it("defers to the active training goal when one exists", async () => {
    const s = await RuleBasedSummary.summarize({
      weekStart: "2026-09-14",
      weekEnd: "2026-09-20",
      games: 2,
      avgPlacement: 3,
      top4Rate: 1,
      wins: 1,
      bottom4: 0,
      mostCommonMistakes: [{ type: "ROLLING", label: "D牌", count: 1 }],
      topComposition: null,
      currentGoal: { id: "g1", title: "控制 D 牌预算", description: undefined },
    });
    expect(s.nextStep).toContain("控制 D 牌预算");
  });
});

describe("weekly aggregation (service)", () => {
  it("aggregates only this week's matches", async () => {
    const { addMatch } = await import("../services/match-service");
    const { weeklyReport } = await import("../services/weekly-service");

    await addMatch({ playedAt: thisWeek(0, 12), placement: "1", composition: "Rebel", primaryMistake: "ROLLING" });
    await addMatch({ playedAt: thisWeek(1, 20), placement: "2", composition: "Rebel" });
    await addMatch({ playedAt: thisWeek(2, 13), placement: "6", composition: "Arcader", primaryMistake: "ROLLING" });
    // outside the current week — must not appear
    await addMatch({ playedAt: "2026-01-05T13:00", placement: "8" });

    const report = await weeklyReport(0);
    expect(report.games).toBe(3);
    expect(report.avgPlacement).toBeCloseTo(3);
    expect(report.top4Rate).toBeCloseTo(2 / 3);
    expect(report.wins).toBe(1);
    expect(report.bottom4).toBe(1);
    expect(report.mostCommonMistakes[0]).toMatchObject({ type: "ROLLING", count: 2 });
    expect(report.topComposition).toMatchObject({ composition: "Rebel", games: 2 });
    expect(report.weekStart).toBe(dateKey(startOfWeek(wallClockNow())));
  });

  it("attaches the current goal when one is active", async () => {
    const { addMatch } = await import("../services/match-service");
    const { weeklyReport } = await import("../services/weekly-service");
    await addGoal({
      title: "控制 D 牌预算",
      description: "4-1 后不无计划 D 到底",
      startDate: dateKey(wallClockNow()),
      status: "active",
      relatedMistakes: ["ROLLING"],
    });
    await addMatch({ playedAt: thisWeek(0, 12), placement: "3" });

    const report = await weeklyReport(0);
    expect(report.currentGoal?.title).toBe("控制 D 牌预算");
    expect(report.summary.nextStep).toContain("控制 D 牌预算");
  });
});
