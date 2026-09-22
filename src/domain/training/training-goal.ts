import { createId, nowIso } from "../../lib/utils";
import { dateKey, wallClockNow } from "../../lib/wallclock";
import { GOAL_STATUS_LABELS, MISTAKE_TYPE_LIST } from "../labels";
import {
  type GoalStatus,
  type MistakeType,
  type TrainingGoal,
} from "../types";

export interface TrainingGoalInput {
  title: string;
  description?: string;
  /** `YYYY-MM-DD` */
  startDate: string;
  /** `YYYY-MM-DD` */
  endDate?: string;
  relatedMistakes?: MistakeType[];
  status: GoalStatus;
}

export function createTrainingGoal(input: TrainingGoalInput): TrainingGoal {
  const now = nowIso();
  return { id: createId(), ...normalize(input), createdAt: now, updatedAt: now };
}

export function applyTrainingGoalInput(
  goal: TrainingGoal,
  input: TrainingGoalInput,
): TrainingGoal {
  return { ...goal, ...normalize(input), updatedAt: nowIso() };
}

export function validateTrainingGoalInput(input: Partial<TrainingGoalInput>): string[] {
  const errors: string[] = [];
  if (!input.title?.trim()) errors.push("请填写目标名称");
  if (!input.startDate) errors.push("请选择开始日期");
  if (input.endDate && input.startDate && input.endDate < input.startDate) {
    errors.push("结束日期不能早于开始日期");
  }
  if (!GOAL_STATUSES.includes(input.status ?? "")) errors.push("状态不合法");
  return errors;
}

const GOAL_STATUSES: string[] = ["active", "completed", "archived"];

/** A goal is "current" while active and not past its end date. */
export function isGoalCurrent(goal: TrainingGoal, today = dateKey(wallClockNow())): boolean {
  if (goal.status !== "active") return false;
  return !goal.endDate || goal.endDate >= today;
}

export function goalStatusLabel(status: GoalStatus): string {
  return GOAL_STATUS_LABELS[status];
}

export function toMistakeTypes(values: readonly unknown[]): MistakeType[] {
  return values.filter((v): v is MistakeType => MISTAKE_TYPE_LIST.includes(v as MistakeType));
}

function normalize(input: TrainingGoalInput): TrainingGoalInput {
  const related = toMistakeTypes(input.relatedMistakes ?? []);
  return {
    title: input.title.trim(),
    description: input.description?.trim() || undefined,
    startDate: input.startDate.slice(0, 10),
    endDate: input.endDate ? input.endDate.slice(0, 10) : undefined,
    relatedMistakes: related.length ? related : undefined,
    status: input.status,
  };
}
