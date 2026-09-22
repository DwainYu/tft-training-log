import { validateMatchInput, type MatchInput } from "../../domain/match/match";
import { MISTAKE_TYPE_LIST } from "../../domain/labels";
import { secondsBetween, toDate, wallClockNow } from "../../lib/wallclock";
import { parseList } from "../../lib/utils";
import type { AdapterResult, DataSourceAdapter } from "./types";

/** Raw shape produced by the match form / Quick Add: strings, nothing parsed. */
export interface ManualMatchPayload {
  /** `YYYY-MM-DDTHH:mm` from a `datetime-local` input; empty means "now". */
  playedAt?: string;
  startedAt?: string;
  endedAt?: string;
  /** Duration entered in minutes. */
  durationMinutes?: string;
  placement?: string | number;
  finalLevel?: string;
  finalHealth?: string;
  totalGold?: string;
  composition?: string;
  traits?: string;
  coreUnits?: string;
  coreItems?: string;
  augments?: string;
  primaryMistake?: string;
  notes?: string;
}

function toNumber(value: string | number | undefined): number | undefined {
  if (value === undefined || value === "") return undefined;
  const n = typeof value === "number" ? value : Number(String(value).replace(/[^\d.+-]/g, ""));
  return Number.isFinite(n) ? n : undefined;
}

/**
 * The single supported source for Phase 1: the player typed it.
 * Turns a loose form payload into a validated `MatchInput`.
 */
export const ManualAdapter: DataSourceAdapter<ManualMatchPayload> = {
  key: "manual",
  label: "手动记录",
  requiresUserInput: true,

  toMatchInput(payload): AdapterResult<MatchInput> {
    const playedAt = payload.playedAt?.trim() || wallClockNow();
    const startedAt = payload.startedAt?.trim() || undefined;
    const endedAt = payload.endedAt?.trim() || undefined;

    const minutes = toNumber(payload.durationMinutes);
    let durationSeconds = minutes !== undefined ? Math.round(minutes * 60) : undefined;
    if (durationSeconds === undefined && startedAt && endedAt) {
      durationSeconds = secondsBetween(startedAt, endedAt);
    }

    const mistakeRaw = payload.primaryMistake?.trim().toUpperCase();
    const primaryMistake = MISTAKE_TYPE_LIST.find((t) => t === mistakeRaw);

    const input: MatchInput = {
      playedAt,
      startedAt,
      endedAt,
      durationSeconds,
      placement: toNumber(payload.placement) ?? 0,
      finalLevel: toNumber(payload.finalLevel),
      finalHealth: toNumber(payload.finalHealth),
      totalGold: toNumber(payload.totalGold),
      composition: payload.composition?.trim() || undefined,
      traits: parseList(payload.traits),
      coreUnits: parseList(payload.coreUnits),
      coreItems: parseList(payload.coreItems),
      augments: parseList(payload.augments),
      primaryMistake,
      notes: payload.notes?.trim() || undefined,
    };

    const errors = validateMatchInput(input);
    if (errors.length > 0) return { ok: false, errors };
    if (!toDate(input.playedAt)) return { ok: false, errors: ["对局时间无法解析"] };

    return { ok: true, value: input };
  },
};
