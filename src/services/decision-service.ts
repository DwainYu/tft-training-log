import { decisionRepository } from "../data/repository/decision-repository";
import {
  applyDecisionInput,
  createDecision,
  decisionRoundOrder,
  validateDecisionInput,
  type DecisionInput,
} from "../domain/decision/decision";
import { ValidationError } from "../lib/errors";
import type { Decision } from "../domain/types";

/** Decisions inside one match, ordered by round (2-1 → 3-2 → 4-1 → 自由记录). */
export async function listDecisions(matchId: string): Promise<Decision[]> {
  const decisions = await decisionRepository.byMatch(matchId);
  return decisions.sort(
    (a, b) => decisionRoundOrder(a) - decisionRoundOrder(b) || a.createdAt.localeCompare(b.createdAt),
  );
}

export async function addDecision(matchId: string, input: DecisionInput): Promise<Decision> {
  const errors = validateDecisionInput(input);
  if (errors.length) throw new ValidationError(errors);
  return decisionRepository.add(createDecision(matchId, input));
}

export async function updateDecision(id: string, input: DecisionInput): Promise<Decision> {
  const existing = await decisionRepository.get(id);
  if (!existing) throw new ValidationError([`决策不存在：${id}`]);
  const errors = validateDecisionInput(input);
  if (errors.length) throw new ValidationError(errors);
  const next = applyDecisionInput(existing, input);
  await decisionRepository.put(next);
  return next;
}

export async function removeDecision(id: string): Promise<void> {
  await decisionRepository.remove(id);
}

export async function allDecisions(): Promise<Decision[]> {
  return decisionRepository.all();
}

/** How many decisions each match has — used by list/detail headers. */
export async function decisionCountByMatch(): Promise<Record<string, number>> {
  const decisions = await decisionRepository.all();
  const out: Record<string, number> = {};
  for (const d of decisions) out[d.matchId] = (out[d.matchId] ?? 0) + 1;
  return out;
}
