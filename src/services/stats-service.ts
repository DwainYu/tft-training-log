import { matchRepository } from "../data/repository/match-repository";
import { mistakeLabel } from "../domain/labels";
import {
  compositionStats,
  mistakeCounts,
  mostCommonMistakes,
  overallStats,
  placementTrendSeries,
  recentWindowStats,
  timeSlotStats,
  trainingStreak,
  UNCLASSIFIED,
  type CompositionStat,
  type OverallStats,
  type TimeSlotStat,
} from "../domain/stats/stats";
import type { MistakeType, Match } from "../domain/types";

/**
 * Statistics are pure functions over the matches table; this service just
 * loads the data and hands the results to the pages. Keeping the math in
 * `domain/stats` means every number here is unit-testable without IndexedDB.
 *
 * Session scope: every function accepts an optional `sessionId`
 * ("current training context"). Omitting it means *all* sessions — the
 * statistics never close the data away from the player.
 */

async function scopedMatches(sessionId?: string): Promise<Match[]> {
  const all = await matchRepository.all();
  return sessionId ? all.filter((m) => m.sessionId === sessionId) : all;
}

export async function allOverall(sessionId?: string): Promise<OverallStats> {
  return overallStats(await scopedMatches(sessionId));
}

export async function allStreak(sessionId?: string): Promise<number> {
  return trainingStreak(await scopedMatches(sessionId));
}

/** Newest-`limit` games, oldest → newest, ready for a line chart. */
export async function trend(limit = 20, sessionId?: string) {
  return placementTrendSeries(await scopedMatches(sessionId), limit);
}

export async function recentWindow(window: number, sessionId?: string) {
  return recentWindowStats(await scopedMatches(sessionId), window);
}

export interface MistakeChartEntry {
  key: MistakeType | typeof UNCLASSIFIED;
  label: string;
  count: number;
}

export async function mistakeChart(sessionId?: string): Promise<MistakeChartEntry[]> {
  return mistakeCounts(await scopedMatches(sessionId))
    .filter((c) => c.type !== UNCLASSIFIED || c.count > 0)
    .map((c) => ({
      key: c.type,
      label: c.type === UNCLASSIFIED ? "未分类" : mistakeLabel(c.type),
      count: c.count,
    }));
}

export async function commonMistakes(limit = 3, sessionId?: string) {
  return mostCommonMistakes(await scopedMatches(sessionId), limit);
}

export async function compositionChart(sessionId?: string): Promise<CompositionStat[]> {
  return compositionStats(await scopedMatches(sessionId));
}

export async function timeSlotChart(sessionId?: string): Promise<TimeSlotStat[]> {
  return timeSlotStats(await scopedMatches(sessionId));
}
