import { avgPlacement } from "../match/match";
import { round } from "../../lib/utils";
import { dateKey, TIME_SLOTS, OUTSIDE_SLOT_KEY, slotKeyOf, wallClockNow } from "../../lib/wallclock";
import type { MistakeType } from "../types";

/** What the statistics engine needs — anything with these fields works, including test fixtures. */
export interface MatchForStats {
  id: string;
  playedAt: string;
  placement: number;
  composition?: string;
  primaryMistake?: MistakeType;
  reviewed?: boolean;
}

/* ------------------------------------------------------------------ */
/* Overall                                                             */
/* ------------------------------------------------------------------ */

export interface OverallStats {
  games: number;
  avgPlacement: number | null;
  top4Rate: number | null;
  winRate: number | null;
  bottom4Rate: number | null;
  wins: number;
  top4: number;
  bottom4: number;
  reviewedGames: number;
}

export function overallStats(matches: MatchForStats[]): OverallStats {
  const games = matches.length;
  const wins = matches.filter((m) => m.placement === 1).length;
  const top4 = matches.filter((m) => m.placement <= 4).length;
  const bottom4 = matches.filter((m) => m.placement > 4).length;
  const reviewedGames = matches.filter((m) => m.reviewed).length;
  return {
    games,
    avgPlacement: avgPlacement(matches.map((m) => m.placement)),
    top4Rate: games ? top4 / games : null,
    winRate: games ? wins / games : null,
    bottom4Rate: games ? bottom4 / games : null,
    wins,
    top4,
    bottom4,
    reviewedGames,
  };
}

/** Newest-first slice: the last `window` games by playedAt. */
export function lastWindow(matches: MatchForStats[], window: number): MatchForStats[] {
  return [...matches]
    .sort((a, b) => b.playedAt.localeCompare(a.playedAt))
    .slice(0, window);
}

export function recentWindowStats(
  matches: MatchForStats[],
  window: number,
): { games: number; avgPlacement: number | null; top4Rate: number | null } {
  const slice = lastWindow(matches, window);
  return {
    games: slice.length,
    avgPlacement: avgPlacement(slice.map((m) => m.placement)),
    top4Rate: slice.length ? slice.filter((m) => m.placement <= 4).length / slice.length : null,
  };
}

/** Placement per game, oldest → newest, for the trend line chart. */
export function placementTrendSeries(matches: MatchForStats[], limit = 20) {
  const slice = lastWindow(matches, limit).reverse();
  return slice.map((m, i) => ({
    index: i + 1,
    label: m.playedAt.slice(5, 10),
    placement: m.placement,
    top4: m.placement <= 4 ? 1 : 0,
    id: m.id,
  }));
}

/* ------------------------------------------------------------------ */
/* Mistake counts                                                      */
/* ------------------------------------------------------------------ */

export const UNCLASSIFIED = "UNCLASSIFIED" as const;

export function mistakeCounts(matches: MatchForStats[]): {
  type: MistakeType | typeof UNCLASSIFIED;
  count: number;
}[] {
  const counts = new Map<string, number>();
  for (const m of matches) {
    const key = m.primaryMistake ?? UNCLASSIFIED;
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  const out: { type: MistakeType | typeof UNCLASSIFIED; count: number }[] = [
    ...counts.entries(),
  ].map(([type, count]) => ({ type: type as MistakeType | typeof UNCLASSIFIED, count }));
  out.sort((a, b) => b.count - a.count || a.type.localeCompare(b.type));
  return out;
}

export function mostCommonMistakes(matches: MatchForStats[], limit = 3) {
  return mistakeCounts(matches)
    .filter((e) => e.type !== UNCLASSIFIED && e.count > 0)
    .slice(0, limit);
}

/* ------------------------------------------------------------------ */
/* Compositions                                                        */
/* ------------------------------------------------------------------ */

export interface CompositionStat {
  composition: string;
  games: number;
  avgPlacement: number | null;
  top4Rate: number | null;
  lastPlayed: string;
}

export function compositionStats(matches: MatchForStats[]): CompositionStat[] {
  const groups = new Map<string, MatchForStats[]>();
  for (const m of matches) {
    const c = m.composition?.trim();
    if (!c) continue;
    const list = groups.get(c) ?? [];
    list.push(m);
    groups.set(c, list);
  }
  const out: CompositionStat[] = [...groups.entries()].map(([composition, ms]) => ({
    composition,
    games: ms.length,
    avgPlacement: avgPlacement(ms.map((m) => m.placement)),
    top4Rate: ms.filter((m) => m.placement <= 4).length / ms.length,
    lastPlayed: ms.map((m) => m.playedAt).sort().pop() ?? "",
  }));
  out.sort((a, b) => b.games - a.games || a.composition.localeCompare(b.composition));
  return out;
}

/* ------------------------------------------------------------------ */
/* Time slots (server window 12:00–22:00, 2h buckets)                  */
/* ------------------------------------------------------------------ */

export interface TimeSlotStat {
  key: string;
  label: string;
  games: number;
  avgPlacement: number | null;
  top4Rate: number | null;
}

export function timeSlotStats(matches: MatchForStats[]): TimeSlotStat[] {
  const groups = new Map<string, MatchForStats[]>();
  for (const m of matches) {
    const key = slotKeyOf(m.playedAt);
    const list = groups.get(key) ?? [];
    list.push(m);
    groups.set(key, list);
  }
  const order = [...TIME_SLOTS.map((s) => s.key), OUTSIDE_SLOT_KEY];
  return order
    .filter((key) => groups.has(key))
    .map((key) => {
      const ms = groups.get(key)!;
      const label =
        key === OUTSIDE_SLOT_KEY
          ? "训练时段外"
          : TIME_SLOTS.find((s) => s.key === key)?.label ?? key;
      return {
        key,
        label,
        games: ms.length,
        avgPlacement: avgPlacement(ms.map((m) => m.placement)),
        top4Rate: ms.filter((m) => m.placement <= 4).length / ms.length,
      };
    });
}

/* ------------------------------------------------------------------ */
/* Streak                                                              */
/* ------------------------------------------------------------------ */

/**
 * Consecutive training days, counting back from today. If today has no
 * game yet, the streak starts from yesterday — an evening player should
 * not lose the streak just because it is 09:00.
 */
export function trainingStreak(matches: MatchForStats[], today = dateKey(wallClockNow())): number {
  const days = new Set(matches.map((m) => dateKey(m.playedAt)));
  if (days.size === 0) return 0;
  const cursor = days.has(today) ? today : shiftDay(today, -1);
  let streak = 0;
  let probe = cursor;
  while (days.has(probe)) {
    streak += 1;
    probe = shiftDay(probe, -1);
  }
  return streak;
}

function shiftDay(dateKeyStr: string, days: number): string {
  const d = new Date(`${dateKeyStr}T12:00`);
  d.setDate(d.getDate() + days);
  const p = (n: number) => n.toString().padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

export function formatRate(value: number | null, digits = 0): string {
  if (value === null || Number.isNaN(value)) return "—";
  return `${round(value * 100, digits)}%`;
}
