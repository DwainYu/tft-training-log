import { describe, expect, it } from "vitest";
import { stripRiotMarkup, truncateText } from "./tft-text";

describe("stripRiotMarkup", () => {
  it("removes tags and placeholder markers", () => {
    expect(stripRiotMarkup("获得<Bright>3</Bright>件、@Gold@金币")).toBe("获得3件、金币");
    expect(stripRiotMarkup("战斗开始时：<br><br>获得@AP@法强")).toBe("战斗开始时：获得法强");
  });

  it("collapses whitespace and tolerates missing text", () => {
    expect(stripRiotMarkup("  多  余\n空格  ")).toBe("多 余 空格");
    expect(stripRiotMarkup(undefined)).toBe("");
    expect(stripRiotMarkup("")).toBe("");
  });
});

describe("truncateText", () => {
  it("cuts long lines and leaves short ones alone", () => {
    expect(truncateText("1234567890", 5)).toBe("12345…");
    expect(truncateText("12345", 5)).toBe("12345");
  });
});
