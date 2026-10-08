import { createId, nowIso } from "../../lib/utils";
import { MISTAKE_TYPES, type MistakeType, type OpeningPlan, type Review } from "../types";

/**
 * The four blocks of a 复盘. Each block answers several prompts (see
 * `REVIEW_SECTIONS`), but is stored as one text field — a review has to stay
 * cheap enough to write after every single game.
 */
export interface ReviewInput {
  opening?: string;
  midGame?: string;
  lateGame?: string;
  bestDecision?: string;
  biggestMistake?: string;
  primaryMistake?: MistakeType;
  nextGameFocus?: string;
  selfScore?: number;
}

export const REVIEW_SECTIONS = {
  opening: {
    title: "1 · 开局",
    prompts: ["开局拿到了什么", "第一件装备", "开局思路", "为什么这么选择"],
  },
  midGame: {
    title: "2 · 中期",
    prompts: ["经济是否健康", "升级是否合理", "D牌是否合理", "阵容转型是否及时", "节奏是否合理"],
  },
  lateGame: {
    title: "3 · 后期",
    prompts: ["最终阵容是否合理", "装备是否合理", "站位是否合理", "是否错过关键升级"],
  },
} as const;

export const EMPTY_REVIEW_INPUT: ReviewInput = {};

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

/* ------------------------------------------------------------------ */
/* Completeness                                                        */
/* ------------------------------------------------------------------ */

/**
 * Everything the app can count as "filled in": the four conclusion fields
 * plus the structured facts that live on the match.
 *
 * The structured fields sit next to the review rather than inside it, so the
 * form carries both while editing.
 */
export interface ReviewProgressInput extends ReviewInput {
  openingPlan?: OpeningPlan;
}

export interface ReviewProgress {
  filled: number;
  total: number;
  percent: number;
  /** Labels of what is still missing, in display order. */
  missing: string[];
}

/**
 * Filling the required block is worth 60% and the optional structured fields
 * share the remaining 40%: `isReviewComplete` — the binary gate behind
 * `match.reviewed` — therefore stays readable inside the number (60% = the
 * match counts as reviewed), while 100% means "everything the app can
 * structure is there".
 *
 * This is a nudge, never a gate: nothing here blocks a save.
 */
export function reviewProgress(input: ReviewProgressInput): ReviewProgress {
  const required = [
    { label: "主要问题", done: Boolean(input.primaryMistake) },
    { label: "本局最大问题", done: Boolean(input.biggestMistake?.trim()) },
    { label: "做得最好的一件事", done: Boolean(input.bestDecision?.trim()) },
    { label: "下一局练习什么", done: Boolean(input.nextGameFocus?.trim()) },
  ];
  const optional = [
    { label: "开局路线", done: Boolean(input.openingPlan) },
    { label: "自我评分", done: typeof input.selfScore === "number" },
  ];

  const requiredDone = required.filter((f) => f.done).length;
  const optionalDone = optional.filter((f) => f.done).length;
  const total = required.length + optional.length;
  const filled = requiredDone + optionalDone;
  const percent =
    Math.round((requiredDone / required.length) * 60 + (optionalDone / optional.length) * 40);

  return {
    filled,
    total,
    percent,
    missing: [...required, ...optional].filter((f) => !f.done).map((f) => f.label),
  };
}

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

/** Review record -> editable form value. */
export function reviewInputOf(review?: Review): ReviewInput {
  if (!review) return {};
  const { id, matchId, createdAt, updatedAt, ...input } = review;
  void id;
  void matchId;
  void createdAt;
  void updatedAt;
  return input;
}

export function isMistakeType(value: unknown): value is MistakeType {
  return typeof value === "string" && (MISTAKE_TYPES as readonly string[]).includes(value);
}

function normalize(input: ReviewInput): ReviewInput {
  return {
    opening: trim(input.opening),
    midGame: trim(input.midGame),
    lateGame: trim(input.lateGame),
    bestDecision: trim(input.bestDecision),
    biggestMistake: trim(input.biggestMistake),
    primaryMistake:
      input.primaryMistake && isMistakeType(input.primaryMistake)
        ? input.primaryMistake
        : undefined,
    nextGameFocus: trim(input.nextGameFocus),
    selfScore: input.selfScore,
  };
}

function trim(value: string | undefined): string | undefined {
  const v = value?.trim();
  return v ? v : undefined;
}
