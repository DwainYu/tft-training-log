import demoFile from "../../data/examples/demo-matches.json";
import { decisionRepository } from "../data/repository/decision-repository";
import { matchRepository } from "../data/repository/match-repository";
import { reviewRepository } from "../data/repository/review-repository";
import { trainingGoalRepository } from "../data/repository/training-goal-repository";
import { DAILY_SESSION_ID, type DatabaseSnapshot } from "../domain/types";
import { addDays, dateKey, toDate, toWallClock, wallClockNow } from "../lib/wallclock";
import { importSnapshot, type ImportReport } from "./export-service";

/**
 * Fictional demo dataset (`data/examples/demo-matches.json`) so a fresh clone
 * can show every screen without touching anyone's real training history.
 *
 * Two rules make it safe to mix with real data:
 *  - every id is prefixed `demo-`, so demo rows can be removed on their own;
 *  - the whole set is re-based onto "today" at load time (newest game = today,
 *    relative gaps kept), so Dashboard streak / Weekly Review / date filters
 *    still look alive no matter when the project is cloned.
 */

export const DEMO_ID_PREFIX = "demo-";

export const isDemoRecord = (id: string): boolean => id.startsWith(DEMO_ID_PREFIX);

/** Day offset that moves the newest demo game onto today. */
function rebaseDays(matches: { playedAt: string }[]): number {
  const newest = matches.reduce((max, m) => (m.playedAt > max ? m.playedAt : max), "");
  if (!newest) return 0;
  const then = toDate(dateKey(newest));
  const now = toDate(dateKey(wallClockNow()));
  if (!then || !now) return 0;
  return Math.round((now.getTime() - then.getTime()) / 86_400_000);
}

/** Date-only (`YYYY-MM-DD`) shift, used by training goals. */
function shiftDateOnly(value: string, days: number): string {
  const date = toDate(value);
  if (!date) return value;
  date.setDate(date.getDate() + days);
  return toWallClock(date, false);
}

/** The fixture, with every date re-based onto today. */
export function demoSnapshot(): DatabaseSnapshot {
  const raw = structuredClone(demoFile as unknown as DatabaseSnapshot);
  const days = rebaseDays(raw.matches);
  if (days === 0) return raw;
  for (const m of raw.matches) {
    m.playedAt = addDays(m.playedAt, days);
    if (m.startedAt) m.startedAt = addDays(m.startedAt, days);
    if (m.endedAt) m.endedAt = addDays(m.endedAt, days);
  }
  for (const g of raw.trainingGoals) {
    g.startDate = shiftDateOnly(g.startDate, days);
    if (g.endDate) g.endDate = shiftDateOnly(g.endDate, days);
  }
  return raw;
}

/**
 * Merge the demo set into the local database (idempotent: ids are stable).
 *
 * Demo data *always* belongs to the built-in daily session, no matter which
 * session the player has selected — it is fictional training context, not
 * competition data.
 */
export function loadDemoData(): Promise<ImportReport> {
  const snapshot = demoSnapshot();
  for (const m of snapshot.matches) {
    m.sessionId = DAILY_SESSION_ID;
  }
  return importSnapshot(snapshot);
}

/** Delete every `demo-` record, leaving real training data untouched. */
export async function removeDemoData(): Promise<number> {
  const [matches, decisions, reviews, goals] = await Promise.all([
    matchRepository.all(),
    decisionRepository.all(),
    reviewRepository.all(),
    trainingGoalRepository.all(),
  ]);
  const targets = [
    matches.filter((m) => isDemoRecord(m.id)).map((m) => matchRepository.remove(m.id)),
    decisions.filter((d) => isDemoRecord(d.id)).map((d) => decisionRepository.remove(d.id)),
    // reviews are keyed by match, so a demo review always sits on a demo match
    reviews.filter((r) => isDemoRecord(r.matchId)).map((r) => reviewRepository.removeByMatch(r.matchId)),
    goals.filter((g) => isDemoRecord(g.id)).map((g) => trainingGoalRepository.remove(g.id)),
  ];
  const removed = targets.flat().length;
  await Promise.all(targets.flat());
  return removed;
}
