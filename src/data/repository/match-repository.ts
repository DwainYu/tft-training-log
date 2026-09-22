import type { Match } from "../../domain/types";
import { db } from "../db";

export interface MatchRepository {
  add(match: Match): Promise<Match>;
  put(match: Match): Promise<Match>;
  bulkPut(matches: Match[]): Promise<void>;
  get(id: string): Promise<Match | undefined>;
  all(): Promise<Match[]>;
  remove(id: string): Promise<void>;
  clear(): Promise<void>;
}

export const matchRepository: MatchRepository = {
  async add(match) {
    await db.matches.add(match);
    return match;
  },
  async put(match) {
    await db.matches.put(match);
    return match;
  },
  async bulkPut(matches) {
    await db.matches.bulkPut(matches);
  },
  async get(id) {
    return db.matches.get(id);
  },
  async all() {
    return db.matches.toArray();
  },
  async remove(id) {
    await db.matches.delete(id);
  },
  async clear() {
    await db.matches.clear();
  },
};
