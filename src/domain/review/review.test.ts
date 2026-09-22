import { describe, expect, it } from "vitest";
import {
  applyReviewInput,
  createReview,
  isMistakeType,
  isReviewComplete,
  patchReview,
  validateReviewInput,
} from "./review";

const complete = {
  primaryMistake: "ROLLING" as const,
  biggestMistake: "4-1 D 牌过深",
  bestDecision: "3-2 上 6",
  nextGameFocus: "只 D 到 2 星主 C",
};

describe("isReviewComplete", () => {
  it("needs all four conclusion answers", () => {
    expect(isReviewComplete(complete)).toBe(true);
    expect(isReviewComplete({ ...complete, biggestMistake: "  " })).toBe(false);
    expect(isReviewComplete({ ...complete, nextGameFocus: undefined })).toBe(false);
    expect(isReviewComplete({ primaryMistake: "ECONOMY" })).toBe(false);
    expect(isReviewComplete({})).toBe(false);
  });
});

describe("validateReviewInput", () => {
  it("passes a complete conclusion", () => {
    expect(validateReviewInput(complete)).toEqual([]);
  });

  it("lists every missing conclusion answer", () => {
    const errors = validateReviewInput({});
    expect(errors).toHaveLength(4);
    expect(errors.join("")).toContain("Primary Mistake");
    expect(errors.join("")).toContain("下一局");
  });

  it("rejects unknown mistake types and out-of-range scores", () => {
    expect(validateReviewInput({ ...complete, primaryMistake: "BAD" as never })).toHaveLength(1);
    expect(validateReviewInput({ ...complete, selfScore: 9 })).toContain("自我评分应在 1 – 5 之间");
    expect(validateReviewInput({ ...complete, selfScore: 4 })).toEqual([]);
  });
});

describe("createReview / patch", () => {
  it("normalises whitespace and drops unknown mistakes", () => {
    const review = createReview("m1", {
      ...complete,
      biggestMistake: "  4-1 D 牌过深  ",
      primaryMistake: "NOPE" as never,
      nextGameFocus: " x ",
    });
    expect(review.biggestMistake).toBe("4-1 D 牌过深");
    expect(review.nextGameFocus).toBe("x");
    expect(review.primaryMistake).toBeUndefined();
    expect(isMistakeType("ROLLING")).toBe(true);
    expect(isMistakeType("ECONOMY-X")).toBe(false);
  });

  it("patch merges only the fields it was given", () => {
    const review = createReview("m1", complete);
    const patched = patchReview(review, { nextGameFocus: "新重点" });
    expect(patched.nextGameFocus).toBe("新重点");
    expect(patched.biggestMistake).toBe(complete.biggestMistake);
    expect(patched.id).toBe(review.id);
    expect(patched.createdAt).toBe(review.createdAt);
  });

  it("apply overwrites with the full submitted input", () => {
    const review = createReview("m1", complete);
    const applied = applyReviewInput(review, {
      ...complete,
      biggestMistake: "改过的问题",
      selfScore: 2,
    });
    expect(applied.biggestMistake).toBe("改过的问题");
    expect(applied.selfScore).toBe(2);
    expect(applied.id).toBe(review.id);
    expect(applied.createdAt).toBe(review.createdAt);
  });
});
