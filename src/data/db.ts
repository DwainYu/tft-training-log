import Dexie, { type Table } from "dexie";
import type {
  Decision,
  Match,
  Review,
  TrainingGoal,
  TrainingSession,
} from "../domain/types";

export interface AppSettings {
  /** Always the literal id `app` — a singleton record. */
  id: "app";
  /** Currently selected training session; `undefined` until bootstrapped. */
  activeSessionId?: string;
  updatedAt: string;
}

/**
 * Local-first persistence. Everything lives in IndexedDB in this browser;
 * `Export / Import` in the Data page is the only escape hatch, and it is
 * deliberately lossless so the player is never locked in.
 *
 * v2 (Phase 2.5) adds `trainingSessions` and `settings` (active session).
 * There is no real user history yet, so the bump is a plain additive
 * schema change — no migration logic.
 */
export class TftTrainingDatabase extends Dexie {
  matches!: Table<Match, string>;
  decisions!: Table<Decision, string>;
  reviews!: Table<Review, string>;
  trainingGoals!: Table<TrainingGoal, string>;
  trainingSessions!: Table<TrainingSession, string>;
  settings!: Table<AppSettings, "app">;

  constructor(name = "tft-training-log") {
    super(name);
    this.version(1).stores({
      matches: "id, playedAt, placement, composition, reviewed, primaryMistake",
      decisions: "id, matchId, type",
      // `&matchId` keeps one review per match enforced by the database.
      reviews: "id, &matchId, primaryMistake, updatedAt",
      trainingGoals: "id, status, startDate",
    });
    this.version(2).stores({
      trainingSessions: "id, type",
      settings: "&id",
    });
  }
}

export const db = new TftTrainingDatabase();
