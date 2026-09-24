import type { TrainingSession } from "../../domain/types";
import { db } from "../db";

export interface TrainingSessionRepository {
  add(session: TrainingSession): Promise<TrainingSession>;
  put(session: TrainingSession): Promise<TrainingSession>;
  bulkPut(sessions: TrainingSession[]): Promise<void>;
  get(id: string): Promise<TrainingSession | undefined>;
  all(): Promise<TrainingSession[]>;
  remove(id: string): Promise<void>;
  clear(): Promise<void>;
}

export const trainingSessionRepository: TrainingSessionRepository = {
  async add(session) {
    await db.trainingSessions.add(session);
    return session;
  },
  async put(session) {
    await db.trainingSessions.put(session);
    return session;
  },
  async bulkPut(sessions) {
    await db.trainingSessions.bulkPut(sessions);
  },
  async get(id) {
    return db.trainingSessions.get(id);
  },
  async all() {
    return db.trainingSessions.toArray();
  },
  async remove(id) {
    await db.trainingSessions.delete(id);
  },
  async clear() {
    await db.trainingSessions.clear();
  },
};
