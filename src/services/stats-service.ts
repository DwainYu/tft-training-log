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
import type { MistakeType } from "../domain/types";

/**
 * Statistics are pure functions over the matches table; this service just
 * loads the data and hands the results to the pages. Keeping the math in
 * `domain/stats` means every number here is unit-testable without IndexedDB.
 */

export async function allOverall(): Promise<OverallStats> {
  return overallStats(await matchRepository.all());
}

export async function allStreak(): Promise<number> {
  return trainingStreak(await matchRepository.all());
}

/** Newest-`limit` games, oldest → newest, ready for a line chart. */
export async function trend(limit = 20) {
  return placementTrendSeries(await matchRepository.all(), limit);
}

export async function recentWindow(window: number) {
  return recentWindowStats(await matchRepository.all(), window);
}

export interface MistakeChartEntry {
  key: MistakeType | typeof UNCLASSIFIED;
  label: string;
  count: number;
}

export async function mistakeChart(): Promise<MistakeChartEntry[]> {
  return mistakeCounts(await matchRepository.all())
    .filter((c) => c.type !== UNCLASSIFIED || c.count > 0)
    .map((c) => ({
      key: c.type,
      label: c.type === UNCLASSIFIED ? "未分类" : mistakeLabel(c.type),
      count: c.count,
    }));
}

export async function commonMistakes(limit = 3) {
  return mostCommonMistakes(await matchRepository.all(), limit);
}

export async function compositionChart(): Promise<CompositionStat[]> {
  return compositionStats(await matchRepository.all());
}

export async function timeSlotChart(): Promise<TimeSlotStat[]> {
  return timeSlotStats(await matchRepository.all());
}
