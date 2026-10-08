import { OPENING_PLANS, type OpeningPlan } from "../types";

/**
 * The opening route is the first structured 复盘 fact. It is a closed
 * vocabulary — that is the whole point of it, because a statistic can only
 * group by a value it can name.
 */

export function isOpeningPlan(value: unknown): value is OpeningPlan {
  return typeof value === "string" && (OPENING_PLANS as readonly string[]).includes(value);
}

/**
 * Unknown values are rejected, never coerced and never guessed at: a value
 * that silently became something else would end up inside a statistic that
 * could then not be reproduced from the record.
 */
export function validateOpeningPlan(value: unknown): string[] {
  if (value === undefined || value === null || value === "") return [];
  return isOpeningPlan(value) ? [] : [`开局路线取值不合法：${String(value)}`];
}

/** Import path: an unrecognised value is dropped, not carried around. */
export function openingPlanOrUndefined(value: unknown): OpeningPlan | undefined {
  return isOpeningPlan(value) ? value : undefined;
}
