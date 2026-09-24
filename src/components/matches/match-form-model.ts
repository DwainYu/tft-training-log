import type { ManualMatchPayload } from "../../data/adapters/manual-adapter";
import type { Match } from "../../domain/types";
import { DAILY_SESSION_ID } from "../../domain/types";
import { formatList } from "../../lib/utils";
import { hourOf, minuteOf } from "../../lib/wallclock";

/**
 * The form is deliberately date + two clock fields (not one datetime each):
 * that is how a player remembers a game — "今天中午那把，12:10 打到 12:45".
 */
export interface MatchFormDraft {
  date: string; // YYYY-MM-DD
  startTime: string; // HH:mm
  endTime: string; // HH:mm
  durationMinutes: string;
  placement: number | undefined;
  finalLevel: string;
  finalHealth: string;
  totalGold: string;
  composition: string;
  traits: string;
  coreUnits: string;
  coreItems: string;
  augments: string;
  primaryMistake: string;
  notes: string;
  /** Training session this match belongs to (defaults to the active one). */
  sessionId: string;
}

const pad = (n: number) => n.toString().padStart(2, "0");
export const timeText = (value: string): string => {
  const h = hourOf(value);
  if (h === null) return "";
  return `${pad(h)}:${pad(minuteOf(value) ?? 0)}`;
};

export function emptyDraft(date = new Date(), sessionId = DAILY_SESSION_ID): MatchFormDraft {
  const p = (n: number) => n.toString().padStart(2, "0");
  return {
    date: `${date.getFullYear()}-${p(date.getMonth() + 1)}-${p(date.getDate())}`,
    startTime: "",
    endTime: "",
    durationMinutes: "",
    placement: undefined,
    finalLevel: "",
    finalHealth: "",
    totalGold: "",
    composition: "",
    traits: "",
    coreUnits: "",
    coreItems: "",
    augments: "",
    primaryMistake: "",
    notes: "",
    sessionId,
  };
}

export function draftFromMatch(
  match: Match,
  fallbackSessionId = DAILY_SESSION_ID,
): MatchFormDraft {
  return {
    date: match.playedAt.slice(0, 10),
    startTime: timeText(match.startedAt ?? ""),
    endTime: timeText(match.endedAt ?? match.playedAt),
    durationMinutes:
      match.durationSeconds !== undefined ? String(Math.round(match.durationSeconds / 60)) : "",
    placement: match.placement,
    finalLevel: match.finalLevel !== undefined ? String(match.finalLevel) : "",
    finalHealth: match.finalHealth !== undefined ? String(match.finalHealth) : "",
    totalGold: match.totalGold !== undefined ? String(match.totalGold) : "",
    composition: match.composition ?? "",
    traits: formatList(match.traits),
    coreUnits: formatList(match.coreUnits),
    coreItems: formatList(match.coreItems),
    augments: formatList(match.augments),
    primaryMistake: match.primaryMistake ?? "",
    notes: match.notes ?? "",
    sessionId: match.sessionId ?? fallbackSessionId,
  };
}

export type MatchFormPayload = ManualMatchPayload & { playedAt: string };

export function draftToPayload(draft: MatchFormDraft): MatchFormPayload {
  const { date, startTime, endTime } = draft;
  const startedAt = startTime ? `${date}T${startTime}` : "";
  const endedAt = endTime ? `${date}T${endTime}` : "";
  // playedAt is the timestamp every list/sort/filter uses: prefer the end of
  // the game, fall back to its start, then to the date alone.
  const playedAt = endedAt || startedAt || date;
  return {
    playedAt,
    startedAt: startedAt || undefined,
    endedAt: endedAt || undefined,
    durationMinutes: draft.durationMinutes,
    placement: draft.placement === undefined ? "" : String(draft.placement),
    finalLevel: draft.finalLevel,
    finalHealth: draft.finalHealth,
    totalGold: draft.totalGold,
    composition: draft.composition,
    traits: draft.traits,
    coreUnits: draft.coreUnits,
    coreItems: draft.coreItems,
    augments: draft.augments,
    primaryMistake: draft.primaryMistake,
    notes: draft.notes,
    sessionId: draft.sessionId || undefined,
  };
}

/** Duration shown while typing: explicit value wins, else derived from the clocks. */
export function effectiveDurationMinutes(draft: MatchFormDraft): string {
  if (draft.durationMinutes.trim()) return draft.durationMinutes.trim();
  if (!draft.startTime || !draft.endTime) return "";
  const [sh, sm] = draft.startTime.split(":").map(Number);
  const [eh, em] = draft.endTime.split(":").map(Number);
  if ([sh, sm, eh, em].some((n) => Number.isNaN(n))) return "";
  const diff = (eh * 60 + em) - (sh * 60 + sm);
  return diff > 0 ? String(diff) : "";
}
