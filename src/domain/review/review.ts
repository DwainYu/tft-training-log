import { createId, nowIso } from "../../lib/utils";
import { MISTAKE_TYPES, type MistakeType, type Review } from "../types";

export interface ReviewInput {
  opening?: string;
  firstItem?: string;
  openingPlan?: string;

  economyHealth?: string;
  midGame?: string;

  lateGame?: string;
  positioning?: string;
  missedUpgrades?: string;

  bestDecision?: string;
  biggestMistake?: string;
  primaryMistake?: MistakeType;
  nextGameFocus?: string;
  selfScore?: number;
}

export function emptyReviewInput(): ReviewInput {
  return {};
}

export function createReview(matchId: string, input: ReviewInput): Review {
  const now = nowIso();
  return { id: createId(), matchId, ...normalize(input), createdAt: now, updatedAt: now };
}

export function applyReviewInput(review: Review, input: ReviewInput): Review {
  return { ...review, ...normalize(input), updatedAt: nowIso() };
}

export function validateReviewInput(input: Partial<ReviewInput>): string[] {
  const errors: string[] = [];
  if (!input.primaryMistake || !isMistakeType(input.primaryMistake)) {
    errors.push("请选择本局最大问题（Primary Mistake）");
  }
  if (!input.nextGameFocus?.trim()) errors.push("请填写下一局要刻意练习什么");
  if (input.selfScore !== undefined && (input.selfScore < 1 || input.selfScore > 5)) {
    errors.push("自我评分应在 1 – 5 之间");
  }
  return errors;
}

/**
 * A match counts as reviewed once the player has committed to a primary mistake
 * and a next-game focus. Everything else stays optional on purpose: the point of
 * the loop is to keep producing reviews, not to gate them.
 */
export function isReviewComplete(input: Partial<ReviewInput>): boolean {
  return Boolean(input.primaryMistake && input.nextGameFocus?.trim());
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
    primaryMistake: input.primaryMistake && isMistakeType(input.primaryMistake) ? input.primaryMistake : undefined,
    nextGameFocus: trim(input.nextGameFocus),
    selfScore: input.selfScore,
  };
}

function trim(value: string | undefined): string | undefined {
  const v = value?.trim();
  return v ? v : undefined;
}
