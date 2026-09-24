/**
 * Core domain types. Storage-agnostic: nothing here knows about Dexie or React.
 *
 * Date convention
 * ---------------
 * `playedAt` / `startedAt` / `endedAt` are *local wall-clock* strings in the
 * shape `YYYY-MM-DDTHH:mm` (no timezone suffix). The tool targets the Chinese
 * TFT server, which lives in a single timezone, so wall-clock keeps sorting,
 * date filtering and the 12:00–22:00 training-window check free of timezone
 * arithmetic. `createdAt` / `updatedAt` are full ISO-8601 instants.
 */

export const MISTAKE_TYPES = [
  "ECONOMY",
  "LEVELING",
  "ROLLING",
  "COMPOSITION",
  "ITEM",
  "AUGMENT",
  "POSITIONING",
  "SCOUTING",
  "TEMPO",
  "TRANSITION",
  "OTHER",
] as const;

export type MistakeType = (typeof MISTAKE_TYPES)[number];

export const DECISION_TYPES = [
  "ECONOMY",
  "LEVELING",
  "ROLLING",
  "COMPOSITION",
  "ITEM",
  "AUGMENT",
  "POSITIONING",
  "STABILIZE",
  "WIN_STREAK",
  "LOSE_STREAK",
  "TRANSITION",
  "OTHER",
] as const;

export type DecisionType = (typeof DECISION_TYPES)[number];

export const MAX_PLACEMENT = 8;
export const TOP4_PLACEMENT = 4;

export interface Match {
  id: string;

  /** `YYYY-MM-DDTHH:mm` — when the game ended (used for sorting/filtering). */
  playedAt: string;
  startedAt?: string;
  endedAt?: string;
  durationSeconds?: number;

  /** 1 – 8 */
  placement: number;

  finalLevel?: number;
  finalHealth?: number;
  totalGold?: number;

  /** Free text in the MVP: composition name as the player writes it. */
  composition?: string;
  traits?: string[];
  coreUnits?: string[];
  coreItems?: string[];
  augments?: string[];

  /**
   * Canonical static-data identifiers (Set 18 snapshot, `data/tft/set18`).
   * Optional and purely additive: the free-text fields above stay the
   * source of record, old records simply have none of these.
   */
  set?: number;
  traitIds?: string[];
  coreUnitIds?: string[];
  coreItemIds?: string[];
  augmentIds?: string[];

  reviewed: boolean;
  primaryMistake?: MistakeType;
  notes?: string;

  createdAt: string;
  updatedAt: string;
}

export interface Decision {
  id: string;
  matchId: string;

  /** e.g. `3-2`, `4-1`, `最终` */
  round: string;
  type: DecisionType;

  situation?: string;
  decision: string;
  reasoning?: string;
  result?: string;

  /** 现在回看是否正确 */
  hindsight?: DecisionHindsight;
  hindsightNote?: string;

  createdAt: string;
}

export const DECISION_HINDSIGHTS = ["correct", "wrong", "mixed"] as const;
export type DecisionHindsight = (typeof DECISION_HINDSIGHTS)[number];

export interface Review {
  id: string;
  matchId: string;

  /** Three blocks, one text field each; the prompts live in REVIEW_SECTIONS. */
  opening?: string;
  midGame?: string;
  lateGame?: string;

  bestDecision?: string;
  biggestMistake?: string;
  primaryMistake?: MistakeType;
  nextGameFocus?: string;

  /** 1 – 5, self assessment of how well the game was played. */
  selfScore?: number;

  createdAt: string;
  updatedAt: string;
}

export const GOAL_STATUSES = ["active", "completed", "archived"] as const;
export type GoalStatus = (typeof GOAL_STATUSES)[number];

export interface TrainingGoal {
  id: string;

  title: string;
  description?: string;

  startDate: string;
  endDate?: string;

  relatedMistakes?: MistakeType[];
  status: GoalStatus;

  createdAt: string;
  updatedAt: string;
}

/** Everything the app persists, in one envelope — used by JSON export/import. */
export interface DatabaseSnapshot {
  schemaVersion: number;
  exportedAt: string;
  app: "tft-training-log";
  matches: Match[];
  decisions: Decision[];
  reviews: Review[];
  trainingGoals: TrainingGoal[];
}

export const SNAPSHOT_SCHEMA_VERSION = 1;
