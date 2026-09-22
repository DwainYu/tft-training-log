import { trainingGoalRepository } from "../data/repository/training-goal-repository";
import {
  applyTrainingGoalInput,
  createTrainingGoal,
  isGoalCurrent,
  validateTrainingGoalInput,
  type TrainingGoalInput,
} from "../domain/training/training-goal";
import { ValidationError } from "../lib/errors";
import { nowIso } from "../lib/utils";
import type { GoalStatus, TrainingGoal } from "../domain/types";

export async function allGoals(): Promise<TrainingGoal[]> {
  const goals = await trainingGoalRepository.all();
  return goals.sort((a, b) => b.startDate.localeCompare(a.startDate) || b.createdAt.localeCompare(a.createdAt));
}

/** Active, not expired, newest first. The Dashboard shows the first of these. */
export async function currentGoals(): Promise<TrainingGoal[]> {
  return (await allGoals()).filter((goal) => isGoalCurrent(goal));
}

export async function getGoal(id: string): Promise<TrainingGoal | undefined> {
  return trainingGoalRepository.get(id);
}

export async function addGoal(input: TrainingGoalInput): Promise<TrainingGoal> {
  const errors = validateTrainingGoalInput(input);
  if (errors.length) throw new ValidationError(errors);
  return trainingGoalRepository.add(createTrainingGoal(input));
}

export async function updateGoal(id: string, input: TrainingGoalInput): Promise<TrainingGoal> {
  const existing = await trainingGoalRepository.get(id);
  if (!existing) throw new ValidationError([`训练目标不存在：${id}`]);
  const errors = validateTrainingGoalInput(input);
  if (errors.length) throw new ValidationError(errors);
  const next = applyTrainingGoalInput(existing, input);
  await trainingGoalRepository.put(next);
  return next;
}

export async function setGoalStatus(id: string, status: GoalStatus): Promise<void> {
  const existing = await trainingGoalRepository.get(id);
  if (!existing) return;
  await trainingGoalRepository.put({ ...existing, status, updatedAt: nowIso() });
}

export async function removeGoal(id: string): Promise<void> {
  await trainingGoalRepository.remove(id);
}
