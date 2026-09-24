import { createId, nowIso } from "../../lib/utils";
import { toDate } from "../../lib/wallclock";
import {
  SESSION_TYPES,
  type SessionType,
  type TrainingSession,
} from "../types";

const DATE_ONLY_RE = /^\d{4}-\d{2}-\d{2}$/;

/** UI labels for the generic session categories (event names live in `name`). */
export const SESSION_TYPE_LABELS: Record<SessionType, string> = {
  daily: "日常",
  competition: "竞赛",
};

/** Typed payload accepted by the service layer (already parsed from the form). */
export interface SessionInput {
  /** Explicit id for the built-in sessions; omitted for user-created ones. */
  id?: string;
  type: SessionType;
  name: string;
  description?: string;
  /** `YYYY-MM-DD`. */
  startDate: string;
  /** `YYYY-MM-DD`, optional. */
  endDate?: string;
  active: boolean;
}

function isValidDateOnly(value: string): boolean {
  return DATE_ONLY_RE.test(value) && toDate(value) !== null;
}

/** Empty string errors — consistent with the other domain validators. */
export function validateSessionInput(input: Partial<SessionInput>): string[] {
  const errors: string[] = [];
  if (input.type !== undefined && !SESSION_TYPES.includes(input.type as SessionType)) {
    errors.push("训练类型不正确");
  }
  if (!input.name?.trim()) {
    errors.push("名称不能为空");
  }
  if (!input.startDate || !isValidDateOnly(input.startDate)) {
    errors.push("开始日期格式不正确（应为 YYYY-MM-DD）");
  }
  if (input.endDate !== undefined && input.endDate !== "") {
    if (!isValidDateOnly(input.endDate)) {
      errors.push("结束日期格式不正确（应为 YYYY-MM-DD）");
    } else if (input.startDate && DATE_ONLY_RE.test(input.startDate) && input.endDate < input.startDate) {
      errors.push("结束日期不能早于开始日期");
    }
  }
  return errors;
}

export function createSession(input: SessionInput): TrainingSession {
  const now = nowIso();
  return {
    id: input.id?.trim() || createId(),
    type: input.type,
    name: input.name.trim(),
    description: input.description?.trim() || undefined,
    startDate: input.startDate,
    endDate: input.endDate || undefined,
    active: input.active,
    createdAt: now,
    updatedAt: now,
  };
}

export function applySessionInput(
  session: TrainingSession,
  input: SessionInput,
): TrainingSession {
  return {
    ...session,
    type: input.type,
    name: input.name.trim(),
    description: input.description?.trim() || undefined,
    startDate: input.startDate,
    endDate: input.endDate || undefined,
    active: input.active,
    updatedAt: nowIso(),
  };
}
