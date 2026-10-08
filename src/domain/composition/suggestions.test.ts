import { describe, expect, it } from "vitest";
import type { CompositionUsage } from "../types";
import {
  DEFAULT_SUGGESTION_LIMITS,
  FREQUENT_MIN_COUNT,
  flattenCompositionOptions,
  pickCompositionSuggestions,
  searchCompositionOptions,
} from "./suggestions";

const u = (
  compositionKey: string,
  usageCount: number,
  lastUsedAt: string,
  firstUsedAt = lastUsedAt,
): CompositionUsage => ({ compositionKey, usageCount, firstUsedAt, lastUsedAt });

describe("pickCompositionSuggestions", () => {
  it("ranks 最近使用 by lastUsedAt DESC", () => {
    const { recent } = pickCompositionSuggestions({
      usage: [u("法师", 9, "2026-02-01T10:00"), u("福牛", 1, "2026-02-05T10:00"), u("斗士", 3, "2026-02-03T10:00")],
      presets: [],
    });
    expect(recent.map((o) => o.key)).toEqual(["福牛", "斗士", "法师"]);
    expect(recent.every((o) => o.source === "recent")).toBe(true);
    // usage counts travel with the option so the chip can show "N 次"
    expect(recent[0].usageCount).toBe(1);
  });

  it("ranks 常用 by usageCount DESC, ties by lastUsedAt DESC", () => {
    const usage = [
      u("A", 4, "2026-02-01T10:00"),
      u("B", 7, "2026-02-02T10:00"),
      u("C", 4, "2026-02-09T10:00"),
      u("D", 4, "2026-02-04T10:00"),
    ];
    // force everything out of 最近使用 so 常用 is what is left to look at
    const { frequent } = pickCompositionSuggestions({ usage, presets: [], limits: { recent: 0 } });
    expect(frequent.map((o) => o.key)).toEqual(["B", "C", "D", "A"]);
  });

  it("keeps a one-off composition out of 常用", () => {
    const { frequent } = pickCompositionSuggestions({
      usage: [u("临时阵容", 1, "2026-02-01T10:00"), u("主力", FREQUENT_MIN_COUNT, "2026-02-01T10:00")],
      presets: [],
      limits: { recent: 0 },
    });
    expect(frequent.map((o) => o.key)).toEqual(["主力"]);
  });

  it("dedupes Recent > Frequent > Preset", () => {
    const sections = pickCompositionSuggestions({
      usage: [u("福牛", 5, "2026-02-05T10:00"), u("法师", 3, "2026-02-01T10:00")],
      presets: ["福牛", "法师", "堡垒", "狙神"],
      // one 最近 slot, so 法师 is left to prove it reappears once, in 常用
      limits: { recent: 1 },
    });
    expect(sections.recent.map((o) => o.key)).toEqual(["福牛"]);
    expect(sections.frequent.map((o) => o.key)).toEqual(["法师"]);
    expect(sections.preset.map((o) => o.key)).toEqual(["堡垒", "狙神"]);
  });

  it("never repeats a key across sections", () => {
    const sections = pickCompositionSuggestions({
      usage: [u("福牛", 2, "2026-02-05T10:00")],
      presets: ["福牛", "福牛 ", "法师", "法师"],
    });
    const keys = flattenCompositionOptions(sections).map((o) => o.key);
    expect(new Set(keys).size).toBe(keys.length);
  });

  it("falls back to presets when there is no usage at all", () => {
    const sections = pickCompositionSuggestions({ usage: [], presets: ["A", "B", "C"] });
    expect(sections.recent).toEqual([]);
    expect(sections.frequent).toEqual([]);
    expect(sections.preset.map((o) => o.key)).toEqual(["A", "B", "C"]);
    expect(sections.preset.every((o) => o.source === "preset")).toBe(true);
  });

  it("normalizes preset names and drops blanks", () => {
    const sections = pickCompositionSuggestions({ usage: [], presets: [" 福牛 ", "  ", "法师"] });
    expect(sections.preset.map((o) => o.key)).toEqual(["福牛", "法师"]);
  });

  it("honours the per-section limits", () => {
    const usage = Array.from({ length: 20 }, (_, i) =>
      u(`C${i}`, 10 - (i % 5), new Date(Date.UTC(2026, 1, i + 1)).toISOString()),
    );
    const sections = pickCompositionSuggestions({
      usage,
      presets: Array.from({ length: 40 }, (_, i) => `P${i}`),
    });
    expect(sections.recent).toHaveLength(DEFAULT_SUGGESTION_LIMITS.recent);
    expect(sections.frequent).toHaveLength(DEFAULT_SUGGESTION_LIMITS.frequent);
    expect(sections.preset).toHaveLength(DEFAULT_SUGGESTION_LIMITS.preset);
  });
});

describe("searchCompositionOptions", () => {
  const options = flattenCompositionOptions(
    pickCompositionSuggestions({
      usage: [u("福牛战神", 2, "2026-02-05T10:00")],
      presets: ["法师", "法术", "重装战士"],
    }),
  );

  it("matches on the normalized key, trimmed and case-insensitive", () => {
    expect(searchCompositionOptions(options, " 法 ").map((o) => o.key)).toEqual(["法师", "法术"]);
    expect(searchCompositionOptions(options, "重装").map((o) => o.key)).toEqual(["重装战士"]);
    expect(searchCompositionOptions(options, "rebel").map((o) => o.key)).toEqual([]);
  });

  it("returns everything for an empty query", () => {
    expect(searchCompositionOptions(options, "   ")).toHaveLength(options.length);
  });

  it("never returns the same composition twice", () => {
    const hits = searchCompositionOptions(options, "法");
    expect(new Set(hits.map((o) => o.key)).size).toBe(hits.length);
  });

  it("keeps display order: 最近 → 常用 → 预置", () => {
    expect(searchCompositionOptions(options, "").map((o) => o.source)).toEqual([
      "recent",
      "preset",
      "preset",
      "preset",
    ]);
  });
});
