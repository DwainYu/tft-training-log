import { beforeEach, describe, expect, it } from "vitest";
import {
  compositionSuggestions,
  listCompositionUsage,
  presetCompositions,
  rebuildCompositionUsage,
  recordCompositionUsage,
} from "./composition-usage-service";
import { addMatch, allMatches, knownCompositions, quickAdd, saveMatchInput, updateMatch } from "./match-service";
import { buildSnapshot, importSnapshot, wipeAll } from "./export-service";
import { saveReview } from "./review-service";
import { compositionUsageRepository } from "../data/repository/composition-usage-repository";
import { resetDatabase } from "../test/db-helper";

beforeEach(resetDatabase);

const usageOf = (key: string) => compositionUsageRepository.get(key);
const usageMap = async () => new Map((await listCompositionUsage()).map((r) => [r.compositionKey, r]));

const add = (composition: string, playedAt: string) =>
  addMatch({ playedAt, placement: "3", composition });

describe("composition usage tracking", () => {
  it("counts one use the first time and increments afterwards", async () => {
    await add("福牛", "2026-02-01T13:00");
    expect((await usageOf("福牛"))?.usageCount).toBe(1);

    await add("福牛", "2026-02-02T14:00");
    expect((await usageOf("福牛"))?.usageCount).toBe(2);

    await add("枪手", "2026-02-02T20:00");
    expect((await usageOf("枪手"))?.usageCount).toBe(1);
    expect((await usageOf("福牛"))?.usageCount).toBe(2);

    expect([...(await usageMap()).keys()]).toHaveLength(2);
  });

  it("stores first / last usage instants and moves lastUsedAt forward", async () => {
    await add("福牛", "2026-02-01T13:00");
    const row = (await usageOf("福牛"))!;
    expect(row.firstUsedAt).toBe(row.lastUsedAt);

    await add("福牛", "2026-02-05T20:00");
    const updated = (await usageOf("福牛"))!;
    expect(updated.firstUsedAt).toBe(row.firstUsedAt);
    expect(Date.parse(updated.lastUsedAt)).toBeGreaterThan(Date.parse(row.lastUsedAt));
  });

  it("does not move lastUsedAt backwards, but tracks the earliest first use", async () => {
    await add("福牛", "2026-02-05T13:00");
    const newer = (await usageOf("福牛"))!.lastUsedAt;

    await add("福牛", "2026-01-01T13:00");
    const backdated = (await usageOf("福牛"))!;
    expect(backdated.lastUsedAt).toBe(newer);
    expect(Date.parse(backdated.firstUsedAt)).toBeLessThan(Date.parse(newer));
    expect(backdated.usageCount).toBe(2);
  });

  it("ignores empty and whitespace-only compositions", async () => {
    await add("", "2026-02-01T13:00");
    await add("   ", "2026-02-01T13:00");
    await addMatch({ playedAt: "2026-02-01T13:00", placement: "3" }); // no field at all
    await recordCompositionUsage(undefined);

    expect(await listCompositionUsage()).toEqual([]);
    expect(await allMatches()).toHaveLength(3); // the matches themselves still saved
  });

  it("counts whitespace variants as one composition", async () => {
    await add("福牛", "2026-02-01T13:00");
    await add(" 福牛", "2026-02-02T13:00");
    await add("福牛  ", "2026-02-03T13:00");
    await add("福牛  战神", "2026-02-04T13:00");
    await add("福牛 战神", "2026-02-05T13:00");

    expect((await usageOf("福牛"))?.usageCount).toBe(3);
    expect((await usageOf("福牛 战神"))?.usageCount).toBe(2);
    expect(await knownCompositions()).toEqual(["福牛", "福牛 战神"]);
  });

  it("counts once per game through Quick Add", async () => {
    await quickAdd({ playedAt: "2026-02-01T13:00", placement: "2", composition: "福牛" });
    await quickAdd({ playedAt: "2026-02-01T15:00", placement: "5", composition: "福牛" });
    expect((await usageOf("福牛"))?.usageCount).toBe(2);
  });

  it("does not count again when the match is edited or reviewed", async () => {
    const created = await add("福牛", "2026-02-01T13:00");
    await updateMatch(created.id, { playedAt: created.playedAt, placement: "4", composition: "福牛" });
    await saveReview(created.id, {
      primaryMistake: "ECONOMY",
      biggestMistake: "利息没吃满",
      bestDecision: "2-5 存钱",
      nextGameFocus: "吃满利息",
    });
    expect((await usageOf("福牛"))?.usageCount).toBe(1);
  });

  it("still counts when a typed input is saved without an id", async () => {
    await saveMatchInput({ playedAt: "2026-02-01T13:00", placement: 3, composition: "枪手" });
    expect((await usageOf("枪手"))?.usageCount).toBe(1);
  });
});

describe("compositionSuggestions", () => {
  it("still offers presets when the usage table is empty", async () => {
    const sections = await compositionSuggestions();
    expect(sections.recent).toEqual([]);
    expect(sections.frequent).toEqual([]);
    expect(sections.preset.length).toBeGreaterThan(0);
    expect(sections.preset.map((o) => o.key)).toContain("法师");
  });

  it("takes presets from the bundled Set 18 static data", () => {
    expect(presetCompositions().length).toBeGreaterThan(10);
    expect(new Set(presetCompositions()).size).toBe(presetCompositions().length);
  });

  it("moves a used composition into 最近使用 and out of the presets", async () => {
    await add("福牛", "2026-02-01T13:00");
    const sections = await compositionSuggestions();
    expect(sections.recent.map((o) => o.key)).toEqual(["福牛"]);
    expect(sections.preset.map((o) => o.key)).not.toContain("福牛");
  });

  it("falls back to 常用 once a composition drops out of 最近使用", async () => {
    await add("福牛", "2026-02-01T13:00");
    await add("福牛", "2026-02-02T13:00");
    for (const other of ["法师", "斗士", "重装战士", "迅捷射手", "裁决使"]) {
      await add(other, "2026-02-10T13:00");
    }
    const sections = await compositionSuggestions();
    expect(sections.recent.map((o) => o.key)).not.toContain("福牛");
    expect(sections.frequent.map((o) => o.key)).toContain("福牛");
    expect(sections.frequent.find((o) => o.key === "福牛")?.usageCount).toBe(2);
  });

  it("counts whitespace variants as one suggestion", async () => {
    await add("福牛", "2026-02-01T13:00");
    await add(" 福牛 ", "2026-02-02T13:00");
    const sections = await compositionSuggestions();
    const keys = [...sections.recent, ...sections.frequent, ...sections.preset].map((o) => o.key);
    expect(keys.filter((k) => k === "福牛")).toHaveLength(1);
  });
});

describe("rebuildCompositionUsage", () => {
  it("rebuilds from existing matches without rewriting their strings", async () => {
    const first = await add("福牛", "2026-02-01T13:00");
    const second = await add("福牛  ", "2026-02-03T13:00");
    await compositionUsageRepository.clear(); // simulate the brand-new empty table

    const rows = await rebuildCompositionUsage();
    expect(rows).toHaveLength(1);
    expect(rows[0].compositionKey).toBe("福牛");
    expect(rows[0].usageCount).toBe(2);
    expect(rows[0].lastUsedAt > rows[0].firstUsedAt).toBe(true);

    // player-typed strings stay exactly as they were written
    const stored = new Map((await allMatches()).map((m) => [m.id, m.composition]));
    expect(stored.get(first.id)).toBe("福牛");
    expect(stored.get(second.id)).toBe("福牛");
  });

  it("is repeatable: a second rebuild does not double the counts", async () => {
    await add("福牛", "2026-02-01T13:00");
    await add("福牛 ", "2026-02-02T13:00");
    await add("枪手", "2026-02-02T15:00");

    await rebuildCompositionUsage();
    const first = await usageMap();
    await rebuildCompositionUsage();
    const second = await usageMap();

    expect(second.get("福牛")?.usageCount).toBe(2);
    expect(second.get("枪手")?.usageCount).toBe(1);
    expect(second.get("福牛")).toEqual(first.get("福牛"));
  });

  it("drops rows whose matches are gone", async () => {
    await add("福牛", "2026-02-01T13:00");
    await add("枪手", "2026-02-01T15:00");
    await wipeAll();
    expect(await listCompositionUsage()).toEqual([]);

    await add("福牛", "2026-02-02T13:00");
    const rows = await rebuildCompositionUsage();
    expect(rows.map((r) => r.compositionKey)).toEqual(["福牛"]);
    expect(rows[0].usageCount).toBe(1);
  });

  it("rebuilds inside an import, so usage travels without being exported", async () => {
    await add("福牛", "2026-02-01T13:00");
    await add("福牛", "2026-02-02T13:00");
    const snap = await buildSnapshot();
    expect(Object.keys(snap)).not.toContain("compositionUsage");

    await wipeAll();
    await importSnapshot(snap);
    expect((await usageOf("福牛"))?.usageCount).toBe(2);
  });

  it("leaves a fresh database usable when there is nothing to rebuild", async () => {
    await rebuildCompositionUsage();
    expect(await listCompositionUsage()).toEqual([]);
    expect(await allMatches()).toEqual([]);
  });
});
