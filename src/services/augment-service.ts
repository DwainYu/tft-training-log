import { augmentRepository } from "../data/tft/repositories";
import { stripRiotMarkup, truncateText } from "../lib/tft-text";

/**
 * View model for the augment picker, over the bundled Set 18 snapshot.
 *
 * Deliberately *not* a copy of the composition ranking: there is no augment
 * usage history in the project, so no Recent / Frequent — the picker is
 * "search + click", and the only state it knows is what the current form has
 * selected (`augmentIds`, ordered like the three in-game picks).
 */

export interface AugmentOption {
  id: string;
  name: string;
  /** One truncated line for the list row. */
  summary: string;
}

/** How many rows a search renders — 592 augments never all hit the DOM. */
export const AUGMENT_RESULT_LIMIT = 30;
export const AUGMENT_SUMMARY_LENGTH = 60;

export function augmentCount(): number {
  return augmentRepository.getAugments().length;
}

function toOption(augment: { id: string; name: string; description: string }): AugmentOption {
  return {
    id: augment.id,
    name: augment.name,
    summary: truncateText(stripRiotMarkup(augment.description), AUGMENT_SUMMARY_LENGTH),
  };
}

/**
 * Name + id + description substring match, trimmed and case-insensitive.
 * An empty query returns the whole snapshot (already limited), so the list is
 * never empty by accident.
 */
export function searchAugments(query: string, limit = AUGMENT_RESULT_LIMIT): AugmentOption[] {
  const q = query.trim().toLowerCase();
  const all = augmentRepository.getAugments();
  const matches = q
    ? all.filter(
        (a) =>
          a.name.toLowerCase().includes(q) ||
          a.id.toLowerCase().includes(q) ||
          stripRiotMarkup(a.description).toLowerCase().includes(q),
      )
    : all;
  return matches.slice(0, limit).map(toOption);
}

/** Selected ids -> options, in the order the player picked them. */
export function augmentOptions(ids: readonly string[]): AugmentOption[] {
  return ids.map((id) => {
    const found = augmentRepository.getAugmentById(id);
    return found ? toOption(found) : { id, name: id, summary: "" };
  });
}

/**
 * Old records only carry the typed name (`Match.augments`); looking the id up
 * lets the picker pre-fill them instead of showing an empty field on edit.
 */
export function augmentIdByName(name: string): string | undefined {
  const q = name.trim().toLowerCase();
  if (!q) return undefined;
  return augmentRepository.getAugments().find((a) => a.name.toLowerCase() === q)?.id;
}
