import { itemRepository } from "../data/tft/repositories";
import { ITEM_CATEGORIES, type ItemCategory } from "../data/tft/types";
import { stripRiotMarkup, truncateText } from "../lib/tft-text";

/**
 * View model for the item picker over the bundled Set 18 snapshot.
 *
 * What this is *not*: a champion loadout. `Match.coreItemIds` is a flat list of
 * the items that mattered in a game — there is no unit association in the data
 * model, so the picker does not invent one (no "第一/第二装备" ordering, no
 * 主C / 主坦 grouping).
 */

export interface ItemOption {
  id: string;
  name: string;
  category: ItemCategory;
  categoryLabel: string;
  /** One truncated line for the list row; empty for most components. */
  summary: string;
}

export const ITEM_RESULT_LIMIT = 30;
const SUMMARY_LENGTH = 60;

/** Chinese labels for the `ItemData.category` enum in the static snapshot. */
export const ITEM_CATEGORY_LABELS: Record<ItemCategory, string> = {
  component: "组件",
  completed: "成装",
  radiant: "光明",
  artifact: "神器",
  support: "辅助",
  emblem: "纹章",
  other: "其他",
};

export function itemCount(): number {
  return itemRepository.getItems().length;
}

export function itemCategoryLabel(category: string): string {
  return ITEM_CATEGORY_LABELS[category as ItemCategory] ?? category;
}

function toOption(item: {
  id: string;
  name: string;
  category: string;
  description: string;
}): ItemOption {
  return {
    id: item.id,
    name: item.name,
    category: (ITEM_CATEGORIES as readonly string[]).includes(item.category)
      ? (item.category as ItemCategory)
      : "other",
    categoryLabel: itemCategoryLabel(item.category),
    summary: truncateText(stripRiotMarkup(item.description), SUMMARY_LENGTH),
  };
}

/**
 * Name + id + description substring match, trimmed and case-insensitive.
 * An empty query returns the whole snapshot (already limited), so the list is
 * never empty by accident.
 */
export function searchItems(query: string, limit = ITEM_RESULT_LIMIT): ItemOption[] {
  const q = query.trim().toLowerCase();
  const all = itemRepository.getItems();
  const matches = q
    ? all.filter(
        (i) =>
          i.name.toLowerCase().includes(q) ||
          i.id.toLowerCase().includes(q) ||
          stripRiotMarkup(i.description).toLowerCase().includes(q),
      )
    : all;
  return matches.slice(0, limit).map(toOption);
}

/** Selected ids -> options (unknown ids keep their raw id as the label). */
export function itemOptions(ids: readonly string[]): ItemOption[] {
  return ids.map((id) => {
    const found = itemRepository.getItemById(id);
    return found
      ? toOption(found)
      : { id, name: id, category: "other", categoryLabel: "其他", summary: "" };
  });
}

/**
 * Old records only carry typed names (`Match.coreItems`) — community shorthand
 * like "无尽" or "蓝buff" mostly does *not* match the official name, so this
 * stays an exact lookup: whatever it cannot resolve is kept as typed text
 * instead of being guessed at.
 */
export function itemIdByName(name: string): string | undefined {
  const q = name.trim().toLowerCase();
  if (!q) return undefined;
  return itemRepository.getItems().find((i) => i.name.toLowerCase() === q)?.id;
}
