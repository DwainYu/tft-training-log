import { decisionRepository } from "../data/repository/decision-repository";
import { matchRepository } from "../data/repository/match-repository";
import { reviewRepository } from "../data/repository/review-repository";
import { trainingGoalRepository } from "../data/repository/training-goal-repository";
import {
  SNAPSHOT_SCHEMA_VERSION,
  type DatabaseSnapshot,
  type Decision,
  type Match,
  type Review,
  type TrainingGoal,
} from "../domain/types";
import { nowIso } from "../lib/utils";

/* ------------------------------------------------------------------ */
/* Build                                                               */
/* ------------------------------------------------------------------ */

export async function buildSnapshot(): Promise<DatabaseSnapshot> {
  const [matches, decisions, reviews, trainingGoals] = await Promise.all([
    matchRepository.all(),
    decisionRepository.all(),
    reviewRepository.all(),
    trainingGoalRepository.all(),
  ]);
  return {
    schemaVersion: SNAPSHOT_SCHEMA_VERSION,
    exportedAt: nowIso(),
    app: "tft-training-log",
    matches,
    decisions,
    reviews,
    trainingGoals,
  };
}

export function snapshotToJson(snapshot: DatabaseSnapshot): string {
  return JSON.stringify(snapshot, null, 2);
}

/* ------------------------------------------------------------------ */
/* CSV                                                                 */
/* ------------------------------------------------------------------ */

const CSV_COLUMNS: { key: keyof Match & string; header: string }[] = [
  { key: "id", header: "id" },
  { key: "playedAt", header: "played_at" },
  { key: "placement", header: "placement" },
  { key: "composition", header: "composition" },
  { key: "finalLevel", header: "final_level" },
  { key: "finalHealth", header: "final_health" },
  { key: "durationSeconds", header: "duration_seconds" },
  { key: "primaryMistake", header: "primary_mistake" },
  { key: "reviewed", header: "reviewed" },
  { key: "notes", header: "notes" },
];

function csvCell(value: unknown): string {
  if (value === undefined || value === null) return "";
  const text = String(value);
  return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

export function matchesToCsv(matches: Match[]): string {
  const lines = [CSV_COLUMNS.map((c) => c.header).join(",")];
  for (const m of matches) {
    lines.push(CSV_COLUMNS.map((c) => csvCell(m[c.key])).join(","));
  }
  return lines.join("\n");
}

export function decisionsToCsv(decisions: Decision[]): string {
  const header = ["id", "matchId", "round", "type", "situation", "decision", "reasoning", "result", "hindsight"];
  const lines = [header.join(",")];
  for (const d of decisions) {
    lines.push(
      [d.id, d.matchId, d.round, d.type, d.situation, d.decision, d.reasoning, d.result, d.hindsight]
        .map(csvCell)
        .join(","),
    );
  }
  return lines.join("\n");
}

/* ------------------------------------------------------------------ */
/* Import                                                              */
/* ------------------------------------------------------------------ */

export interface ImportReport {
  matches: number;
  decisions: number;
  reviews: number;
  trainingGoals: number;
  skipped: number;
  importedAt: string;
}

const isRecord = (v: unknown): v is Record<string, unknown> =>
  typeof v === "object" && v !== null && !Array.isArray(v);

const hasId = (r: Record<string, unknown>): boolean =>
  typeof r.id === "string" && r.id.length > 0;

/** Parse + sanity-check the JSON the player uploaded. Throws on bad shape. */
export function parseSnapshot(text: string): DatabaseSnapshot {
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    throw new Error("文件不是合法的 JSON");
  }
  if (!isRecord(raw) || raw.app !== "tft-training-log") {
    throw new Error("不是 TFT Training Log 导出的文件（缺少 app 标识）");
  }
  const snap = raw as Partial<DatabaseSnapshot>;
  for (const key of ["matches", "decisions", "reviews", "trainingGoals"] as const) {
    if (!Array.isArray(snap[key])) {
      throw new Error(`文件缺少 ${key} 数组`);
    }
  }
  return snap as DatabaseSnapshot;
}

/**
 * Merge semantics (upsert by id): importing a backup never destroys newer
 * local records — this keeps the tool safe to use with old exports.
 */
export async function importSnapshot(snapshot: DatabaseSnapshot): Promise<ImportReport> {
  let skipped = 0;

  const matches = snapshot.matches.filter((m) => isRecord(m) && hasId(m) && typeof m.placement === "number");
  const validMatchIds = new Set(matches.map((m) => m.id));
  const decisions = snapshot.decisions.filter(
    (d) => isRecord(d) && hasId(d) && typeof d.matchId === "string" && validMatchIds.has(d.matchId),
  );
  const reviews = snapshot.reviews.filter(
    (r) => isRecord(r) && hasId(r) && typeof r.matchId === "string" && validMatchIds.has(r.matchId),
  );
  const trainingGoals = snapshot.trainingGoals.filter((g) => isRecord(g) && hasId(g) && typeof g.title === "string");

  skipped =
    (snapshot.matches.length - matches.length) +
    (snapshot.decisions.length - decisions.length) +
    (snapshot.reviews.length - reviews.length) +
    (snapshot.trainingGoals.length - trainingGoals.length);

  // children first, parents last — a review/decision is only useful with its match
  await Promise.all([
    matchRepository.bulkPut(matches as Match[]),
    decisionRepository.bulkPut(decisions as Decision[]),
    reviewRepository.bulkPut(reviews as Review[]),
    trainingGoalRepository.bulkPut(trainingGoals as TrainingGoal[]),
  ]);

  return {
    matches: matches.length,
    decisions: decisions.length,
    reviews: reviews.length,
    trainingGoals: trainingGoals.length,
    skipped,
    importedAt: nowIso(),
  };
}

export async function storageCounts(): Promise<{ matches: number; decisions: number; reviews: number; trainingGoals: number }> {
  const [m, d, r, g] = await Promise.all([
    matchRepository.all(),
    decisionRepository.all(),
    reviewRepository.all(),
    trainingGoalRepository.all(),
  ]);
  return { matches: m.length, decisions: d.length, reviews: r.length, trainingGoals: g.length };
}

export async function wipeAll(): Promise<void> {
  await Promise.all([
    matchRepository.clear(),
    decisionRepository.clear(),
    reviewRepository.clear(),
    trainingGoalRepository.clear(),
  ]);
}

/* ------------------------------------------------------------------ */
/* Browser download helper (thin — the pure builders above are tested) */
/* ------------------------------------------------------------------ */

export function downloadText(filename: string, text: string, mime = "text/plain"): void {
  const blob = new Blob([text], { type: `${mime};charset=utf-8` });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 4000);
}

export function stampForFilename(): string {
  return nowIso().replace(/[:.]/g, "-").slice(0, 19);
}
