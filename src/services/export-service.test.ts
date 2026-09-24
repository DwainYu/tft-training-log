import { beforeEach, describe, expect, it } from "vitest";
import {
  buildSnapshot,
  decisionsToCsv,
  importSnapshot,
  matchesToCsv,
  parseSnapshot,
} from "./export-service";
import { addMatch } from "./match-service";
import { addDecision } from "./decision-service";
import { addGoal } from "./training-service";
import { saveReview } from "./review-service";
import { matchRepository } from "../data/repository/match-repository";
import { resetDatabase } from "../test/db-helper";
import { SNAPSHOT_SCHEMA_VERSION, type Match } from "../domain/types";

beforeEach(resetDatabase);

async function seedTwo() {
  const a = await addMatch({
    playedAt: "2026-02-05T13:20",
    placement: "1",
    composition: "Arcader, gold-rush",
    notes: '他说了"上6"',
  });
  const b = await addMatch({ playedAt: "2026-02-04T20:10", placement: "7", composition: "Rebel" });
  await addDecision(a.id, { round: "3-2", type: "LEVELING", decision: "上 6", reasoning: "保战斗力" });
  await saveReview(a.id, {
    primaryMistake: "ECONOMY",
    biggestMistake: "利息没吃满",
    bestDecision: "2-5 存钱",
    nextGameFocus: "吃满利息",
  });
  await addGoal({
    title: "控制 D 牌预算",
    startDate: "2026-02-01",
    status: "active",
    relatedMistakes: ["ROLLING"],
  });
  return { a, b };
}

describe("export", () => {
  it("builds a snapshot with all four tables", async () => {
    await seedTwo();
    const snap = await buildSnapshot();
    expect(snap.app).toBe("tft-training-log");
    expect(snap.schemaVersion).toBe(SNAPSHOT_SCHEMA_VERSION);
    expect(snap.matches).toHaveLength(2);
    expect(snap.decisions).toHaveLength(1);
    expect(snap.reviews).toHaveLength(1);
    expect(snap.trainingGoals).toHaveLength(1);
  });

  it("renders CSV with proper escaping", async () => {
    const { a } = await seedTwo();
    const csv = matchesToCsv(await matchRepository.all());
    const lines = csv.split("\n");
    expect(lines[0]).toBe("id,played_at,placement,composition,final_level,final_health,duration_seconds,primary_mistake,reviewed,notes");
    const rowA = lines.find((l) => l.includes(a.id))!;
    // commas inside composition and quotes inside notes must be escaped
    expect(rowA).toContain(`"Arcader, gold-rush"`);
    expect(rowA).toContain(`"他说了""上6"""`);
    expect(lines).toHaveLength(3); // header + 2 matches

    const { allDecisions } = await import("./decision-service");
    const dcsv = decisionsToCsv(await allDecisions());
    expect(dcsv.split("\n")).toHaveLength(2);
    expect(dcsv.split("\n")[0]).toContain("matchId");
  });
});

describe("import", () => {
  it("round-trips a full snapshot without losing newer local data", async () => {
    const { a } = await seedTwo();
    const snap = await buildSnapshot();

    // local evolves after the snapshot
    await addMatch({ playedAt: "2026-02-06T13:00", placement: "2", composition: "Fortune" });
    const newer = await addMatch({ playedAt: "2026-02-07T13:00", placement: "3" });

    const report = await importSnapshot(snap);
    expect(report).toMatchObject({ matches: 2, decisions: 1, reviews: 1, trainingGoals: 1, skipped: 0 });

    const all = await matchRepository.all();
    expect(all).toHaveLength(4); // 2 from snapshot + 2 local
    expect(all.map((m: Match) => m.id)).toContain(newer.id);
    expect(all.map((m: Match) => m.id)).toContain(a.id);
  });

  it("skips orphan decisions/reviews and malformed rows", async () => {
    const snap = await buildSnapshot();
    snap.decisions.push({ id: "x", matchId: "ghost-match" } as never);
    snap.reviews.push({ id: "y", matchId: "ghost-match" } as never);
    snap.matches.push({ id: "no-placement" } as never);

    const report = await importSnapshot(snap);
    expect(report.skipped).toBe(3);
    const decisions = await import("./decision-service").then((m) => m.allDecisions());
    expect(decisions.filter((d) => d.matchId === "ghost-match")).toHaveLength(0);
  });

  it("rejects foreign files", () => {
    expect(() => parseSnapshot("{ nope")).toThrow("不是合法的 JSON");
    expect(() => parseSnapshot(JSON.stringify({ app: "other-app", matches: [] }))).toThrow("app 标识");
    expect(() => parseSnapshot(JSON.stringify({ app: "tft-training-log", matches: [] }))).toThrow(
      "缺少 decisions 数组",
    );
  });
});

describe("import + Set 18 static ids", () => {
  it("imports a match carrying valid S18 ids and keeps them", async () => {
    const snap = await buildSnapshot();
    snap.matches.push({
      id: "linked-m1",
      playedAt: "2026-02-09T21:00",
      placement: 5,
      set: 18,
      traitIds: ["DA_18_Spellweaver"],
      coreUnitIds: ["DA_18_Azir"],
      coreItemIds: ["TFT_Item_ArchangelsStaff"],
      augmentIds: ["DA_18_BigGrabBag"],
    } as unknown as Match);
    const report = await importSnapshot(snap);
    expect(report.matches).toBe(1);
    expect(report.skipped).toBe(0);
    const m = await matchRepository.get("linked-m1");
    expect(m?.coreUnitIds).toEqual(["DA_18_Azir"]);
    expect(m?.traitIds).toEqual(["DA_18_Spellweaver"]);
  });

  it("skips matches whose ids cannot be resolved in the Set 18 snapshot", async () => {
    const snap = await buildSnapshot();
    snap.matches.push({
      id: "linked-bad",
      playedAt: "2026-02-09T21:00",
      placement: 5,
      coreUnitIds: ["DA_18_NotACampion"],
    } as unknown as Match);
    snap.matches.push({
      id: "linked-wrong-set",
      playedAt: "2026-02-09T21:00",
      placement: 5,
      set: 19,
    } as unknown as Match);
    const report = await importSnapshot(snap);
    expect(report.skipped).toBe(2);
    expect(await matchRepository.get("linked-bad")).toBeUndefined();
  });
});
