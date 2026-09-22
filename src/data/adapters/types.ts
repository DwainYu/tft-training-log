import type { MatchInput } from "../../domain/match/match";

export type DataSourceKey = "manual" | "lcu" | "screenshot" | "riot";

export type AdapterResult<T> = { ok: true; value: T } | { ok: false; errors: string[] };

/**
 * A `DataSourceAdapter` is the only place that knows *where* a match came from.
 * Everything downstream (services, repositories, statistics, future agent tools)
 * consumes plain `MatchInput`, so adding the LCU / screenshot / Riot adapters
 * later will not touch the domain or the UI.
 *
 * Phase 1 ships `ManualAdapter` only — see ROADMAP.md for the rest.
 */
export interface DataSourceAdapter<TPayload> {
  readonly key: DataSourceKey;
  readonly label: string;
  /** False for adapters that can pull history without the player typing. */
  readonly requiresUserInput: boolean;
  toMatchInput(payload: TPayload): AdapterResult<MatchInput>;
}
