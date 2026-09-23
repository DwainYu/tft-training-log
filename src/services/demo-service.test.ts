import { beforeEach, describe, expect, it } from "vitest";
import { matchRepository } from "../data/repository/match-repository";
import { MISTAKE_TYPES } from "../domain/types";
import { dateKey, wallClockNow } from "../lib/wallclock";
import { allOverall } from "./stats-service";
import { addMatch } from "./match-service";
import { demoSnapshot, loadDemoData, removeDemoData } from "./demo-service";
import { storageCounts } from "./export-service";
import { resetDatabase } from "../test/db-helper";

beforeEach(resetDatabase);

describe("demo fixture", () => {
  it("is fictional, complete and self-consistent", () => {
    const snap = demoSnapshot();
    expect(snap.app).toBe("tft-training-log");
    expect(snap.matches.length).toBeGreaterThanOrEqual(10);
    expect(snap.matches.length).toBeLessThanOrEqual(20);

    const ids = new Set(snap.matches.map((m) => m.id));
    expect(ids.size).toBe(snap.matches.length);
    for (const m of snap.matches) {
      expect(m.id.startsWith("demo-")).toBe(true);
      expect(m.placement).toBeGreaterThanOrEqual(1);
      expect(m.placement).toBeLessThanOrEqual(8);
      if (m.primaryMistake) expect(MISTAKE_TYPES).toContain(m.primaryMistake);
    }
    for (const d of snap.decisions) expect(ids.has(d.matchId)).toBe(true);
    for (const r of snap.reviews) expect(ids.has(r.matchId)).toBe(true);

    // enough variety to light up every screen
    expect(snap.matches.filter((m) => m.reviewed).length).toBeGreaterThan(0);
    expect(snap.matches.some((m) => !m.reviewed)).toBe(true);
    expect(snap.matches.filter((m) => m.placement === 1).length).toBeGreaterThan(0);
    expect(new Set(snap.matches.map((m) => m.composition)).size).toBeGreaterThan(1);
    expect(snap.trainingGoals.some((g) => g.status === "active")).toBe(true);
  });

  it("re-bases the newest game onto today, keeping the gaps", () => {
    const snap = demoSnapshot();
    const days = [...new Set(snap.matches.map((m) => dateKey(m.playedAt)))].sort();
    expect(days.at(-1)).toBe(dateKey(wallClockNow()));
    // relative rhythm is preserved: the fixture still spans about two weeks
    expect(days.length).toBeGreaterThanOrEqual(8);
  });
});

describe("loadDemoData / removeDemoData", () => {
  it("writes the demo set and is idempotent", async () => {
    const snap = demoSnapshot();
    const report = await loadDemoData();
    expect(report.matches).toBe(snap.matches.length);

    const counts = await storageCounts();
    expect(counts).toEqual({
      matches: snap.matches.length,
      decisions: snap.decisions.length,
      reviews: snap.reviews.length,
      trainingGoals: snap.trainingGoals.length,
    });

    await loadDemoData();
    expect(await storageCounts()).toEqual(counts);
  });

  it("feeds the statistics engine", async () => {
    await loadDemoData();
    const overall = await allOverall();
    expect(overall.games).toBeGreaterThan(0);
    expect(overall.avgPlacement).toBeGreaterThan(1);
    expect(overall.top4Rate).toBeGreaterThan(0);
  });

  it("removes only demo records", async () => {
    await loadDemoData();
    const real = await addMatch({ playedAt: "2026-03-01T20:00", placement: "4", composition: "Real deck" });

    const removed = await removeDemoData();
    expect(removed).toBeGreaterThan(0);

    const counts = await storageCounts();
    expect(counts.matches).toBe(1);
    expect(counts.decisions).toBe(0);
    expect(counts.reviews).toBe(0);
    expect(await matchRepository.get(real.id)).toBeDefined();
  });
});
