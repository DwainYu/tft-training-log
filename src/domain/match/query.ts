import { formatDateTime, toDate } from "../../lib/wallclock";
import { isBottom4, isTop4, isWin, type MatchForQuery } from "./match";

export type PlacementFilter = "all" | "top4" | "bottom4" | "win";
export type ReviewedFilter = "all" | "reviewed" | "unreviewed";
export type MistakeFilter = "all" | "none" | string;
export type SortField = "playedAt" | "placement" | "duration" | "composition";
export type SortDir = "asc" | "desc";

export interface MatchQuery {
  search?: string;
  placement?: PlacementFilter;
  reviewed?: ReviewedFilter;
  composition?: string;
  mistake?: MistakeFilter;
  /** `YYYY-MM-DD`, inclusive */
  from?: string;
  to?: string;
  sortField?: SortField;
  sortDir?: SortDir;
  limit?: number;
}

export const DEFAULT_MATCH_QUERY: Required<Pick<MatchQuery, "sortField" | "sortDir">> = {
  sortField: "playedAt",
  sortDir: "desc",
};

/** Pure, DB-free filter/sort so the Matches page behaviour is unit-testable. */
export function queryMatches<T extends MatchForQuery>(matches: readonly T[], q: MatchQuery): T[] {
  const search = q.search?.trim().toLowerCase();
  const from = q.from ? toDate(`${q.from}T00:00`) : null;
  const to = q.to ? toDate(`${q.to}T23:59`) : null;

  const filtered = matches.filter((m) => {
    if (q.placement && q.placement !== "all") {
      if (q.placement === "top4" && !isTop4(m)) return false;
      if (q.placement === "bottom4" && !isBottom4(m)) return false;
      if (q.placement === "win" && !isWin(m)) return false;
    }
    if (q.reviewed === "reviewed" && !m.reviewed) return false;
    if (q.reviewed === "unreviewed" && m.reviewed) return false;
    if (q.composition && q.composition !== "all" && m.composition !== q.composition) return false;

    if (q.mistake && q.mistake !== "all") {
      if (q.mistake === "none") {
        if (m.primaryMistake) return false;
      } else if (m.primaryMistake !== q.mistake) return false;
    }

    const at = toDate(m.playedAt);
    if (at) {
      if (from && at < from) return false;
      if (to && at > to) return false;
    }

    if (search) {
      if (!matchSearchText(m, search)) return false;
    }
    return true;
  });

  const field = q.sortField ?? DEFAULT_MATCH_QUERY.sortField;
  const dir = q.sortDir ?? DEFAULT_MATCH_QUERY.sortDir;
  const sorted = [...filtered].sort((a, b) => compareMatches(a, b, field));
  return dir === "desc" ? sorted.reverse() : sorted;
}

function compareMatches(a: MatchForQuery, b: MatchForQuery, field: SortField): number {
  switch (field) {
    case "placement":
      return a.placement - b.placement || a.playedAt.localeCompare(b.playedAt);
    case "duration":
      return (a.durationSeconds ?? 0) - (b.durationSeconds ?? 0);
    case "composition":
      return (a.composition ?? "zzz").localeCompare(b.composition ?? "zzz");
    case "playedAt":
    default:
      return a.playedAt.localeCompare(b.playedAt);
  }
}

const SEARCHABLE = (m: MatchForQuery): string[] => [
  m.composition ?? "",
  ...(m.traits ?? []),
  ...(m.coreUnits ?? []),
  ...(m.coreItems ?? []),
  ...(m.augments ?? []),
  m.notes ?? "",
  m.primaryMistake ?? "",
  String(m.placement),
  formatDateTime(m.playedAt),
];

function matchSearchText(m: MatchForQuery, search: string): boolean {
  return SEARCHABLE(m).some((text) => text.toLowerCase().includes(search));
}

export const EMPTY_MATCH_QUERY: MatchQuery = {
  search: "",
  placement: "all",
  reviewed: "all",
  composition: "all",
  mistake: "all",
  from: "",
  to: "",
  sortField: "playedAt",
  sortDir: "desc",
};
