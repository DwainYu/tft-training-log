import { describe, expect, it } from "vitest";
import {
  augmentCount,
  augmentIdByName,
  augmentOptions,
  searchAugments,
} from "./augment-service";

describe("augment service (real Set 18 snapshot)", () => {
  it("sees the bundled augments", () => {
    expect(augmentCount()).toBeGreaterThan(500);
    expect(searchAugments("").length).toBeGreaterThan(0);
  });

  it("searches by name", () => {
    const hits = searchAugments("百宝袋");
    expect(hits.length).toBeGreaterThan(1);
    expect(hits[0].id).toBe("DA_18_BigGrabBag");
    expect(hits[0].name).toBe("大百宝袋");
  });

  it("searches by description too", () => {
    const hits = searchAugments("装备重铸器");
    expect(hits.map((a) => a.id)).toContain("DA_18_BigGrabBag");
  });

  it("trims and ignores case, and matches the canonical id", () => {
    expect(searchAugments("  百宝袋  ").map((a) => a.id)).toContain("DA_18_BigGrabBag");
    expect(searchAugments("  biggrabbag ").map((a) => a.id)).toContain("DA_18_BigGrabBag");
  });

  it("returns nothing for a query that matches nothing", () => {
    expect(searchAugments("这个海克斯一定不存在")).toEqual([]);
  });

  it("keeps the result list bounded", () => {
    expect(searchAugments("装备").length).toBeLessThanOrEqual(30);
  });

  it("truncates the row summary so the list never grows", () => {
    const long = searchAugments("").find((a) => a.summary.length > 0)!;
    expect(long.summary.length).toBeLessThanOrEqual(61);
  });
});

describe("augment selection view model", () => {
  it("resolves ids in the order they were picked", () => {
    const options = augmentOptions(["DA_18_BigGrabBag", "DA_18_BlossomTraitAugment"]);
    expect(options.map((o) => o.name)).toEqual(["大百宝袋", "绽灵花的约定"]);
  });

  it("falls back to the raw id for a record the snapshot does not know", () => {
    const options = augmentOptions(["legacy-augment"]);
    expect(options).toEqual([{ id: "legacy-augment", name: "legacy-augment", summary: "" }]);
  });

  it("looks up an id from the name old records typed by hand", () => {
    expect(augmentIdByName("大百宝袋")).toBe("DA_18_BigGrabBag");
    expect(augmentIdByName("  大百宝袋 ")).toBe("DA_18_BigGrabBag");
    expect(augmentIdByName("不存在的海克斯")).toBeUndefined();
  });
});
