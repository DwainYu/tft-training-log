import { normalizeCompositionKey } from "./composition";
import type { CompositionUsage } from "../types";

/**
 * The view model the composition selector renders — a pure `usage + presets ->
 * sections` fold, so ranking and dedupe are testable without React or Dexie.
 *
 * Only ordering lives here: no Top4 rate, no patch, no recommendation. The
 * selector's job is "pick fast", not "analyse".
 */

export type CompositionSource = "recent" | "frequent" | "preset";

export interface CompositionOption {
  /** Normalized key — the value written back into the form. */
  key: string;
  /** What the player sees. */
  label: string;
  source: CompositionSource;
  usageCount?: number;
  lastUsedAt?: string;
}

export interface CompositionSections {
  recent: CompositionOption[];
  frequent: CompositionOption[];
  preset: CompositionOption[];
}

export interface SuggestionLimits {
  recent?: number;
  frequent?: number;
  preset?: number;
}

export const DEFAULT_SUGGESTION_LIMITS: Required<SuggestionLimits> = {
  recent: 5,
  frequent: 5,
  // The bundled Set 18 snapshot carries 36 traits; the cap only exists so a
  // future, much larger static list cannot flood the panel.
  preset: 40,
};

/** One game is "最近用过", not "常用"; 常用 only starts at the second game. */
export const FREQUENT_MIN_COUNT = 2;

export function pickCompositionSuggestions({
  usage,
  presets,
  limits = {},
}: {
  usage: readonly CompositionUsage[];
  presets: readonly string[];
  limits?: SuggestionLimits;
}): CompositionSections {
  const max = { ...DEFAULT_SUGGESTION_LIMITS, ...limits };

  const recent = [...usage].sort(byRecency).slice(0, max.recent);
  const recentKeys = new Set(recent.map((r) => r.compositionKey));

  const frequent = [...usage]
    .filter((r) => !recentKeys.has(r.compositionKey) && r.usageCount >= FREQUENT_MIN_COUNT)
    .sort(byFrequency)
    .slice(0, max.frequent);

  // Recent wins, then Frequent; Preset is filler and never repeats a name the
  // player has already used.
  const taken = new Set([...recentKeys, ...frequent.map((r) => r.compositionKey)]);
  const preset: CompositionOption[] = [];
  for (const name of presets) {
    const key = normalizeCompositionKey(name);
    if (!key || taken.has(key)) continue;
    taken.add(key);
    preset.push({ key, label: key, source: "preset" });
    if (preset.length >= max.preset) break;
  }

  return {
    recent: recent.map((r) => toOption(r, "recent")),
    frequent: frequent.map((r) => toOption(r, "frequent")),
    preset,
  };
}

/** Sections in the order the player reads them, already deduped. */
export function flattenCompositionOptions(sections: CompositionSections): CompositionOption[] {
  return [...sections.recent, ...sections.frequent, ...sections.preset];
}

/**
 * Substring match on the normalized key, case-insensitive for Latin names.
 * Sections are already deduped, so a query can never return the same
 * composition twice.
 */
export function searchCompositionOptions(
  options: readonly CompositionOption[],
  query: string,
): CompositionOption[] {
  const q = normalizeCompositionKey(query).toLowerCase();
  if (!q) return [...options];
  return options.filter((o) => o.key.toLowerCase().includes(q));
}

function toOption(row: CompositionUsage, source: CompositionSource): CompositionOption {
  return {
    key: row.compositionKey,
    label: row.compositionKey,
    source,
    usageCount: row.usageCount,
    lastUsedAt: row.lastUsedAt,
  };
}

/** Newest first; ties broken by usage so the player's main comp stays on top. */
function byRecency(a: CompositionUsage, b: CompositionUsage): number {
  return (
    b.lastUsedAt.localeCompare(a.lastUsedAt) ||
    b.usageCount - a.usageCount ||
    a.compositionKey.localeCompare(b.compositionKey)
  );
}

/** Most played first; ties broken by recency, then by name for stability. */
function byFrequency(a: CompositionUsage, b: CompositionUsage): number {
  return (
    b.usageCount - a.usageCount ||
    b.lastUsedAt.localeCompare(a.lastUsedAt) ||
    a.compositionKey.localeCompare(b.compositionKey)
  );
}
