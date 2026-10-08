import { describe, expect, it } from "vitest";
import {
  searchTraits,
  traitBreakpointLabel,
  traitCount,
  traitIdByName,
  traitOptions,
} from "./trait-service";

describe("trait service (real Set 18 snapshot)", () => {
  it("sees the bundled traits", () => {
    expect(traitCount()).toBe(36);
    expect(searchTraits("").length).toBeGreaterThan(0);
  });

  it("searches by name and by id", () => {
    expect(searchTraits("法师").map((t) => t.id)).toContain("DA_18_Spellweaver");
    expect(searchTraits("DA_18_Spellweaver").map((t) => t.name)).toContain("法师");
  });

  it("searches by effect text and carries the tiers along", () => {
    const hits = searchTraits("全能吸血");
    expect(hits.map((t) => t.name)).toContain("狂战士");
    expect(hits.find((t) => t.name === "狂战士")?.breakpoints).toEqual([2, 4, 6]);
  });

  it("trims, ignores case and finds nothing when there is nothing", () => {
    expect(searchTraits("  法师  ").map((t) => t.name)).toContain("法师");
    expect(searchTraits("  da_18_spellweaver ").map((t) => t.name)).toContain("法师");
    expect(searchTraits("这个羁绊一定不存在")).toEqual([]);
  });

  it("formats the published tiers", () => {
    expect(traitBreakpointLabel([3, 5, 7])).toBe("3 / 5 / 7");
    expect(traitBreakpointLabel([])).toBe("");
  });
});

describe("trait selection view model", () => {
  it("resolves ids to names", () => {
    expect(traitOptions(["DA_18_Spellweaver"])[0].name).toBe("法师");
  });

  it("keeps an unknown id visible instead of hiding it", () => {
    expect(traitOptions(["legacy-trait"])[0].name).toBe("legacy-trait");
  });

  it("looks up an id from the exact official name only", () => {
    expect(traitIdByName("法师")).toBe("DA_18_Spellweaver");
    expect(traitIdByName("  法师 ")).toBe("DA_18_Spellweaver");
    // shorthand is not guessed at — it stays legacy text
    expect(traitIdByName("重装")).toBeUndefined();
  });
});
