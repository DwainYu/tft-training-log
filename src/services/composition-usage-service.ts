import { compositionUsageRepository } from "../data/repository/composition-usage-repository";
import { matchRepository } from "../data/repository/match-repository";
import { traitRepository } from "../data/tft/repositories";
import {
  normalizeCompositionKey,
  summarizeCompositionUsage,
} from "../domain/composition/composition";
import {
  pickCompositionSuggestions,
  type CompositionSections,
  type SuggestionLimits,
} from "../domain/composition/suggestions";
import type { CompositionUsage } from "../domain/types";
import { toDate } from "../lib/wallclock";
import { nowIso } from "../lib/utils";

/**
 * Composition usage: the data foundation for Recent / Frequent / Preset
 * picking (Phase 3A). Nothing in the UI reads this yet — Step 1 only makes
 * sure real numbers accumulate.
 *
 * Rows are *derived* from matches, so every write here is best effort: a
 * failure must never lose a match the player already logged.
 */

/**
 * Preset *tags* for the composition field = the Set 18 羁绊 names already
 * bundled in `data/tft/set18`.
 *
 * This is a stop-gap, not a composition catalogue: the project has no
 * Composition entity, so these trait names are only offered as starting points
 * (the selector labels them as such). A trait is a synergy a board had; a
 * composition is the player's own label for the line — see `trait-service`.
 */
export function presetCompositions(): string[] {
  return traitRepository.getTraits().map((t) => t.name);
}

/**
 * What the selector renders: 最近使用 / 常用 / 更多, deduped and ranked. Only
 * the usage table and the static snapshot are read — never the match table.
 */
export async function compositionSuggestions(limits?: SuggestionLimits): Promise<CompositionSections> {
  const usage = await listCompositionUsage();
  return pickCompositionSuggestions({ usage, presets: presetCompositions(), limits });
}

/** Most used first, most recently used breaking ties. */
export async function listCompositionUsage(): Promise<CompositionUsage[]> {
  const rows = await compositionUsageRepository.all();
  return rows.sort(
    (a, b) => b.usageCount - a.usageCount || b.lastUsedAt.localeCompare(a.lastUsedAt),
  );
}

/**
 * Count one use of `composition`. Blank / whitespace-only input is ignored,
 * and variants that normalize to the same key share a single row.
 *
 * `playedAt` (`YYYY-MM-DDTHH:mm`) is the instant the composition was used, so
 * a rebuild over the same matches reproduces the very same rows.
 */
export async function recordCompositionUsage(
  composition: string | undefined,
  playedAt?: string,
): Promise<void> {
  const key = normalizeCompositionKey(composition);
  if (!key) return;
  const usedAt = (playedAt ? toDate(playedAt) : null)?.toISOString() ?? nowIso();
  await compositionUsageRepository.recordUse(key, usedAt);
}

/**
 * Recompute the whole table from the match history: how a fresh import, a
 * wipe, or an older database gets its counts. Idempotent — running it twice
 * over unchanged matches leaves the counts untouched, because every row is
 * rewritten from scratch instead of being incremented.
 *
 * Existing matches are never modified, and the original player-typed strings
 * stay exactly as they are: only the normalized keys are counted.
 */
export async function rebuildCompositionUsage(): Promise<CompositionUsage[]> {
  const rows = summarizeCompositionUsage(await matchRepository.all());
  await compositionUsageRepository.replaceAll(rows);
  return rows;
}
