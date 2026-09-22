import { createId, nowIso } from "../../lib/utils";
import { MISTAKE_TYPES, type MistakeType, type Review } from "../types";

export interface ReviewInput {
  /** 1. 开局 */
  opening?: string;
  firstItem?: string;
  openingPlan?: string;

  /** 2. 中期 */
  economyHealth?: string;
  midGame?: string;

  /** 3. 后期 */
  lateGame?: string;
  positioning?: string;
  missedUpgrades?: string;

  /** 4. 复盘结论 */
  bestDecision?: string;
  biggestMistake?: string;
  primaryMistake?: MistakeType;
  nextGameFocus?: string;

  selfScore?: number;
}

/** The four answers that make a match "reviewed". Everything else is optional. */
export function isReviewComplete(input: Partial<ReviewInput>): boolean {
  return Boolean(
    input.primaryMistake &&
      input.biggestMistake?.trim() &&
      input.bestDecision?.trim() &&
      input.nextGameFocus?.trim(),
  );
}

export function validateReviewInput(input: Partial<ReviewInput>): string[] {
  const errors: string[] = [];
  if (!input.primaryMistake || !isMistakeType(input.primaryMistake)) {
    errors.push("请选择本局最大问题（Primary Mistake）");
  }
  if (!input.biggestMistake?.trim()) errors.push("请填写本局最大的问题");
  if (!input.bestDecision?.trim()) errors.push("请填写本局做得最好的一件事");
  if (!input.nextGameFocus?.trim()) errors.push("请填写下一局要刻意练习什么");
  if (input.selfScore !== undefined && (input.selfScore < 1 || input.selfScore > 5)) {
    errors.push("自我评分应在 1 – 5 之间");
  }
  return errors;
}

export const EMPTY_REVIEW_INPUT: ReviewInput = {};

export function createReview(matchId: string, input: ReviewInput): Review {
  const now = nowIso();
  return { id: createId(), matchId, ...normalize(input), createdAt: now, updatedAt: now };
}

export function applyReviewInput(review: Review, input: ReviewInput): Review {
  return { ...review, ...normalize(input), updatedAt: nowIso() };
}

/** Merge only the fields the caller actually sent — used by Quick Add seeding. */
export function patchReview(review: Review, patch: ReviewInput): Review {
  const clean = normalize(patch);
  const merged: ReviewInput = { ...review };
  for (const key of Object.keys(clean) as (keyof ReviewInput)[]) {
    const value = clean[key];
    if (value !== undefined) (merged as Record<string, unknown>)[key] = value;
  }
  return { ...review, ...normalize(merged), updatedAt: nowIso() };
}

export function reviewSummaryText(review: Review): string {
  return [review.opening, review.midGame, review.lateGame, review.biggestMistake]
    .filter(Boolean)
    .join("\n\n");
}

export function isMistakeType(value: unknown): value is MistakeType {
  return typeof value === "string" && (MISTAKE_TYPES as readonly string[]).includes(value);
}

function normalize(input: ReviewInput): ReviewInput {
  return {
    opening: trim(input.opening),
    firstItem: trim(input.firstItem),
    openingPlan: trim(input.openingPlan),
    economyHealth: trim(input.economyHealth),
    midGame: trim(input.midGame),
    lateGame: trim(input.lateGame),
    positioning: trim(input.positioning),
    missedUpgrades: trim(input.missedUpgrades),
    bestDecision: trim(input.bestDecision),
    biggestMistake: trim(input.biggestMistake),
    primaryMistake:
      input.primaryMistake && isMistakeType(input.primaryMistake) ? input.primaryMistake : undefined,
    nextGameFocus: trim(input.nextGameFocus),
    selfScore: input.selfScore,
  };
}

function trim(value: string | undefined): string | undefined {
  const v = value?.trim();
  return v ? v : undefined;
}
