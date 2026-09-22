import type { TrainingGoal } from "../../domain/types";
import { db } from "../db";

export interface TrainingGoalRepository {
  add(goal: TrainingGoal): Promise<TrainingGoal>;
  put(goal: TrainingGoal): Promise<TrainingGoal>;
  bulkPut(goals: TrainingGoal[]): Promise<void>;
  get(id: string): Promise<TrainingGoal | undefined>;
  all(): Promise<TrainingGoal[]>;
  remove(id: string): Promise<void>;
  clear(): Promise<void>;
}

export const trainingGoalRepository: TrainingGoalRepository = {
  async add(goal) {
    await db.trainingGoals.add(goal);
    return goal;
  },
  async put(goal) {
    await db.trainingGoals.put(goal);
    return goal;
  },
  async bulkPut(goals) {
    await db.trainingGoals.bulkPut(goals);
  },
  async get(id) {
    return db.trainingGoals.get(id);
  },
  async all() {
    return db.trainingGoals.toArray();
  },
  async remove(id) {
    await db.trainingGoals.delete(id);
  },
  async clear() {
    await db.trainingGoals.clear();
  },
};
