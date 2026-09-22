import { describe, expect, it } from "vitest";
import {
  applyDecisionInput,
  createDecision,
  decisionRoundOrder,
  isDecisionType,
  validateDecisionInput,
} from "./decision";

const base = {
  round: "3-2",
  type: "LEVELING" as const,
  situation: "42 金币，72 血",
  decision: "直接上 6",
  reasoning: "希望保持战斗力",
};

describe("createDecision", () => {
  it("trims text and drops empty optionals", () => {
    const d = createDecision("m1", {
      ...base,
      situation: "  42 金币  ",
      result: "   ",
    });
    expect(d.matchId).toBe("m1");
    expect(d.situation).toBe("42 金币");
    expect(d.result).toBeUndefined();
    expect(d.createdAt).toMatch(/^\d{4}-/);
  });

  it("keeps identity and createdAt when applying", () => {
    const d = createDecision("m1", base);
    const next = applyDecisionInput(d, { ...base, decision: "改成 5 级" });
    expect(next.id).toBe(d.id);
    expect(next.createdAt).toBe(d.createdAt);
    expect(next.decision).toBe("改成 5 级");
  });
});

describe("validateDecisionInput", () => {
  it("passes a normal entry", () => {
    expect(validateDecisionInput(base)).toEqual([]);
  });

  it("needs round, a valid type and a decision", () => {
    expect(validateDecisionInput({ ...base, round: " " })).toContain("请填写回合，例如 3-2");
    expect(validateDecisionInput({ ...base, decision: " " })).toContain("请填写你的决定");
    expect(validateDecisionInput({ ...base, type: "NOPE" as never })).toContain("请选择决策类型");
  });

  it("accepts only declared decision types", () => {
    expect(isDecisionType("STABILIZE")).toBe(true);
    expect(isDecisionType("ROLLING")).toBe(true);
    expect(isDecisionType("MIND")).toBe(false);
  });
});

describe("decisionRoundOrder", () => {
  it("sorts phase-round chronologically", () => {
    const mk = (round: string, n = 0) =>
      createDecision("m1", { ...base, round, decision: `d${n}` });
    const finals = mk("决赛圈");
    const a45 = mk("4-5");
    const a31 = mk("3-1");
    const a32 = mk("3-2");
    const a21 = mk("2-1");
    expect([a45, a31, a32, a21, finals].sort((x, y) => decisionRoundOrder(x) - decisionRoundOrder(y))
      .map((d) => d.round)).toEqual(["2-1", "3-1", "3-2", "4-5", "决赛圈"]);
  });
});
