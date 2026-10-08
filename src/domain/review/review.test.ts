import { describe, expect, it } from "vitest";
import {
  applyReviewInput,
  createReview,
  isMistakeType,
  isReviewComplete,
  patchReview,
  reviewProgress,
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

describe("reviewProgress", () => {
  it("is 0% before anything is filled in", () => {
    const p = reviewProgress({});
    expect(p.percent).toBe(0);
    expect(p.filled).toBe(0);
    expect(p.missing).toHaveLength(6);
  });

  it("counts one field as one sixth, not as complete", () => {
    const p = reviewProgress({ openingPlan: "ECONOMY" });
    expect(p.percent).toBe(20);
    expect(p.filled).toBe(1);
    expect(p.missing).toContain("主要问题");
    expect(p.missing).not.toContain("开局路线");
  });

  it("is 60% when the required conclusion is complete — the reviewed gate", () => {
    const p = reviewProgress(complete);
    expect(p.percent).toBe(60);
    expect(p.missing).toEqual(["开局路线", "自我评分"]);
  });

  it("is 100% only when every structured field is there", () => {
    const p = reviewProgress({ ...complete, openingPlan: "FORCE", selfScore: 4 });
    expect(p.percent).toBe(100);
    expect(p.filled).toBe(p.total);
    expect(p.missing).toEqual([]);
  });

  it("ignores whitespace-only answers", () => {
    // 3 of 4 required = 45%
    expect(reviewProgress({ ...complete, bestDecision: "   " }).percent).toBe(45);
  });
});
