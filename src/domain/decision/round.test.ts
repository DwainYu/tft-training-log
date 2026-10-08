import { describe, expect, it } from "vitest";
import { compareRounds, parseRound } from "./round";

describe("parseRound", () => {
  it("parses stage-index rounds", () => {
    expect(parseRound("2-1")).toEqual({ stage: 2, index: 1 });
    expect(parseRound("10-1")).toEqual({ stage: 10, index: 1 });
    expect(parseRound(" 3-2 ")).toEqual({ stage: 3, index: 2 }); // trimmed
  });

  it("rejects everything that is not exactly stage-index", () => {
    expect(parseRound("最终")).toBeNull();
    expect(parseRound("mid")).toBeNull();
    expect(parseRound("后期")).toBeNull();
    expect(parseRound("")).toBeNull();
    expect(parseRound(undefined)).toBeNull();
    expect(parseRound("3")).toBeNull();
    expect(parseRound("3-")).toBeNull();
    expect(parseRound("a-b")).toBeNull();
    // a stray digit pair inside a longer text is not a round
    expect(parseRound("around 3-2 maybe")).toBeNull();
  });
});

describe("compareRounds", () => {
  it("orders stage then index, including large stages", () => {
    const rounds = ["3-2", "10-1", "2-3", "2-1", "2-2", "3-1"];
    expect([...rounds].sort(compareRounds)).toEqual(["2-1", "2-2", "2-3", "3-1", "3-2", "10-1"]);
  });

  it("sorts unparseable values after every parseable one", () => {
    const rounds = ["最终", "2-1", "mid", "7-5"];
    expect([...rounds].sort(compareRounds)).toEqual(["2-1", "7-5", "最终", "mid"]);
  });

  it("returns 0 for two unparseable values — caller keeps insertion order", () => {
    expect(compareRounds("最终", "mid")).toBe(0);
    expect(compareRounds("", "")).toBe(0);
  });

  it("is stable for identical rounds", () => {
    expect(compareRounds("4-1", "4-1")).toBe(0);
  });
});
