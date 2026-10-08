import { traitRepository } from "../data/tft/repositories";
import { stripRiotMarkup, truncateText } from "../lib/tft-text";

/**
 * View model for the trait picker over the bundled Set 18 snapshot (36 traits).
 *
 * A trait here means **a synergy the final board had** — `Match.traitIds`, a
 * plain set. It is *not* the composition: the composition is the player's own
 * label for the game's line/archetype, the traits are the synergies that were
 * actually active. The two stay separate concepts.
 */

export interface TraitOption {
  id: string;
  name: string;
  /** Published effect tiers, e.g. `[3, 5, 7]`. May be empty in the snapshot. */
  breakpoints: number[];
  /** One truncated line for the list row. */
  summary: string;
}

/** The snapshot holds 36 traits, so the default list shows all of them. */
export const TRAIT_RESULT_LIMIT = 40;
const SUMMARY_LENGTH = 60;

export function traitCount(): number {
  return traitRepository.getTraits().length;
}

/** `3 / 5 / 7` — compact tier display; empty when the snapshot has none. */
export function traitBreakpointLabel(breakpoints: readonly number[]): string {
  return breakpoints.join(" / ");
}

function toOption(trait: { id: string; name: string; breakpoints: number[]; description: string }): TraitOption {
  return {
    id: trait.id,
    name: trait.name,
    breakpoints: trait.breakpoints ?? [],
    summary: truncateText(stripRiotMarkup(trait.description), SUMMARY_LENGTH),
  };
}

/**
 * Name + id + description substring match, trimmed and case-insensitive.
 * An empty query returns the whole snapshot, so the list is never empty by
 * accident.
 */
export function searchTraits(query: string, limit = TRAIT_RESULT_LIMIT): TraitOption[] {
  const q = query.trim().toLowerCase();
  const all = traitRepository.getTraits();
  const matches = q
    ? all.filter(
        (t) =>
          t.name.toLowerCase().includes(q) ||
          t.id.toLowerCase().includes(q) ||
          stripRiotMarkup(t.description).toLowerCase().includes(q),
      )
    : all;
  return matches.slice(0, limit).map(toOption);
}

/** Selected ids -> options (unknown ids keep their raw id as the label). */
export function traitOptions(ids: readonly string[]): TraitOption[] {
  return ids.map((id) => {
    const found = traitRepository.getTraitById(id);
    return found ? toOption(found) : { id, name: id, breakpoints: [], summary: "" };
  });
}

/**
 * Old records only carry typed names (`Match.traits`) — shorthand like "重装"
 * does not exist in the snapshot ("重装战士"), so this stays an exact lookup
 * and whatever it cannot resolve is kept as typed text, never guessed at.
 */
export function traitIdByName(name: string): string | undefined {
  const q = name.trim().toLowerCase();
  if (!q) return undefined;
  return traitRepository.getTraits().find((t) => t.name.toLowerCase() === q)?.id;
}
