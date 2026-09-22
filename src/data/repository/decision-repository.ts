import type { Decision } from "../../domain/types";
import { db } from "../db";

export interface DecisionRepository {
  add(decision: Decision): Promise<Decision>;
  put(decision: Decision): Promise<Decision>;
  bulkPut(decisions: Decision[]): Promise<void>;
  get(id: string): Promise<Decision | undefined>;
  byMatch(matchId: string): Promise<Decision[]>;
  all(): Promise<Decision[]>;
  remove(id: string): Promise<void>;
  removeByMatch(matchId: string): Promise<void>;
  clear(): Promise<void>;
}

export const decisionRepository: DecisionRepository = {
  async add(decision) {
    await db.decisions.add(decision);
    return decision;
  },
  async put(decision) {
    await db.decisions.put(decision);
    return decision;
  },
  async bulkPut(decisions) {
    await db.decisions.bulkPut(decisions);
  },
  async get(id) {
    return db.decisions.get(id);
  },
  async byMatch(matchId) {
    return db.decisions.where("matchId").equals(matchId).toArray();
  },
  async all() {
    return db.decisions.toArray();
  },
  async remove(id) {
    await db.decisions.delete(id);
  },
  async removeByMatch(matchId) {
    await db.decisions.where("matchId").equals(matchId).delete();
  },
  async clear() {
    await db.decisions.clear();
  },
};
