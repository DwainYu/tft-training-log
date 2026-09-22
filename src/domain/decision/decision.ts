import { createId, nowIso } from "../../lib/utils";
import { DECISION_TYPES, type Decision, type DecisionHindsight, type DecisionType } from "../types";

export interface DecisionInput {
  round: string;
  type: DecisionType;
  situation: string;
  decision: string;
  reasoning: string;
  result?: string;
  hindsight?: DecisionHindsight;
  hindsightNote?: string;
}

export function createDecision(matchId: string, input: DecisionInput): Decision {
  return {
    id: createId(),
    matchId,
    round: input.round.trim(),
    type: input.type,
    situation: input.situation.trim(),
    decision: input.decision.trim(),
    reasoning: input.reasoning.trim(),
    result: input.result?.trim() || undefined,
    hindsight: input.hindsight,
    hindsightNote: input.hindsightNote?.trim() || undefined,
    createdAt: nowIso(),
  };
}

export function applyDecisionInput(decision: Decision, input: DecisionInput): Decision {
  return { ...createDecision(decision.matchId, input), id: decision.id, createdAt: decision.createdAt };
}

export function validateDecisionInput(input: Partial<DecisionInput>): string[] {
  const errors: string[] = [];
  if (!input.round?.trim()) errors.push("请填写回合，例如 3-2");
  if (!input.type || !isDecisionType(input.type)) errors.push("请选择决策类型");
  if (!input.decision?.trim()) errors.push("请填写你的决定");
  return errors;
}

export function isDecisionType(value: unknown): value is DecisionType {
  return typeof value === "string" && (DECISION_TYPES as readonly string[]).includes(value);
}

/** Rough chronological key for sorting rounds like "2-1", "3-2", "4-5", "最终". */
export function decisionRoundOrder(decision: Decision): number {
  const m = /^(\d+)-(\d+)$/.exec(decision.round.trim());
  if (!m) return Number.MAX_SAFE_INTEGER;
  return Number(m[1]) * 100 + Number(m[2]);
}
