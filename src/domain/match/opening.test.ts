import { describe, expect, it } from "vitest";
import { isOpeningPlan, openingPlanOrUndefined, validateOpeningPlan } from "./opening";

describe("isOpeningPlan", () => {
  it("accepts exactly the closed vocabulary", () => {
    for (const plan of ["WIN_STREAK", "LOSE_STREAK", "STANDARD", "ECONOMY", "FORCE"]) {
      expect(isOpeningPlan(plan)).toBe(true);
    }
    expect(isOpeningPlan("连胜")).toBe(false);
    expect(isOpeningPlan("")).toBe(false);
    expect(isOpeningPlan(undefined)).toBe(false);
    expect(isOpeningPlan(1)).toBe(false);
  });
});

describe("validateOpeningPlan", () => {
  it("allows a missing value — the field is optional", () => {
    expect(validateOpeningPlan(undefined)).toEqual([]);
    expect(validateOpeningPlan("")).toEqual([]);
    expect(validateOpeningPlan("STANDARD")).toEqual([]);
  });

  it("rejects an unknown enum instead of guessing", () => {
    expect(validateOpeningPlan("SOMETHING_ELSE")).toEqual([
      "开局路线取值不合法：SOMETHING_ELSE",
    ]);
  });
});

describe("openingPlanOrUndefined", () => {
  it("drops values the vocabulary does not know (import path)", () => {
    expect(openingPlanOrUndefined("FORCE")).toBe("FORCE");
    expect(openingPlanOrUndefined("FORCED")).toBeUndefined();
    expect(openingPlanOrUndefined(undefined)).toBeUndefined();
  });
});
