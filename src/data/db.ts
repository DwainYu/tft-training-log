import Dexie, { type Table } from "dexie";
import type { Decision, Match, Review, TrainingGoal } from "../domain/types";

/**
 * Local-first persistence. Everything lives in IndexedDB in this browser;
 * `Export / Import` in the Data page is the only escape hatch, and it is
 * deliberately lossless so the player is never locked in.
 */
export class TftTrainingDatabase extends Dexie {
  matches!: Table<Match, string>;
  decisions!: Table<Decision, string>;
  reviews!: Table<Review, string>;
  trainingGoals!: Table<TrainingGoal, string>;

  constructor(name = "tft-training-log") {
    super(name);
    this.version(1).stores({
      matches: "id, playedAt, placement, composition, reviewed, primaryMistake",
      decisions: "id, matchId, type",
      // `&matchId` keeps one review per match enforced by the database.
      reviews: "id, &matchId, primaryMistake, updatedAt",
      trainingGoals: "id, status, startDate",
    });
  }
}

export const db = new TftTrainingDatabase();
