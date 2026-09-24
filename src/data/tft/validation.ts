import { CHAMPION_COSTS, ITEM_CATEGORIES, type TftDataSnapshot } from "./types";

/**
 * Integrity checks for a static data snapshot. Used two ways:
 *
 * 1. at import time for the bundled set-18 files (fail fast, in CI),
 * 2. in tests, against fixtures that deliberately break the schema.
 *
 * Returns a list of human-readable problems; empty means the data is sound.
 */
export function validateDataset(data: TftDataSnapshot): string[] {
  const errors: string[] = [];
  errors.push(...validateManifest(data.manifest, data));

  const set = data.manifest.set;

  const champions = data.champions ?? [];
  const seenChampionIds = new Set<string>();
  for (const c of champions) {
    if (typeof c.id !== "string" || !c.id.trim()) errors.push(`champion: missing id`);
    if (seenChampionIds.has(c.id)) errors.push(`champion: duplicate id "${c.id}"`);
    seenChampionIds.add(c.id);
    if (typeof c.name !== "string" || !c.name.trim()) errors.push(`champion ${c.id}: empty name`);
    if (!CHAMPION_COSTS.includes(c.cost as (typeof CHAMPION_COSTS)[number])) {
      errors.push(`champion ${c.id}: invalid cost ${String(c.cost)}`);
    }
    if (c.set !== set) errors.push(`champion ${c.id}: set ${c.set} != manifest set ${set}`);
    if (!Array.isArray(c.traits)) errors.push(`champion ${c.id}: traits must be an array`);
  }

  const traitIds = new Set<string>();
  for (const t of data.traits ?? []) {
    if (typeof t.id !== "string" || !t.id.trim()) errors.push(`trait: missing id`);
    if (traitIds.has(t.id)) errors.push(`trait: duplicate id "${t.id}"`);
    traitIds.add(t.id);
    if (typeof t.name !== "string" || !t.name.trim()) errors.push(`trait ${t.id}: empty name`);
  }

  const itemIds = new Set<string>();
  for (const i of data.items ?? []) {
    if (typeof i.id !== "string" || !i.id.trim()) errors.push(`item: missing id`);
    if (itemIds.has(i.id)) errors.push(`item: duplicate id "${i.id}"`);
    itemIds.add(i.id);
    if (typeof i.name !== "string" || !i.name.trim()) errors.push(`item ${i.id}: empty name`);
    if (!ITEM_CATEGORIES.includes(i.category)) {
      errors.push(`item ${i.id}: unknown category "${String(i.category)}"`);
    }
  }

  const seenAugmentIds = new Set<string>();
  for (const a of data.augments ?? []) {
    if (typeof a.id !== "string" || !a.id.trim()) errors.push(`augment: missing id`);
    if (seenAugmentIds.has(a.id)) errors.push(`augment: duplicate id "${a.id}"`);
    seenAugmentIds.add(a.id);
    if (typeof a.name !== "string" || !a.name.trim()) errors.push(`augment ${a.id}: empty name`);
  }

  // cross-references
  for (const c of champions) {
    for (const ref of c.traits ?? []) {
      if (!traitIds.has(ref)) errors.push(`champion ${c.id}: unknown trait "${ref}"`);
    }
  }
  for (const i of data.items ?? []) {
    for (const ref of i.composition ?? []) {
      if (!itemIds.has(ref)) errors.push(`item ${i.id}: composition references unknown item "${ref}"`);
    }
  }

  return errors;
}

function validateManifest(manifest: TftDataSnapshot["manifest"], data: TftDataSnapshot): string[] {
  const errors: string[] = [];
  if (typeof manifest.set !== "number" || !Number.isInteger(manifest.set)) {
    errors.push("manifest: set must be an integer");
  }
  if (typeof manifest.version !== "string" || !manifest.version.trim()) {
    errors.push("manifest: version must be a non-empty string");
  }
  if (typeof manifest.schemaVersion !== "number" || manifest.schemaVersion < 1) {
    errors.push("manifest: schemaVersion must be >= 1");
  }
  if (typeof manifest.source?.url !== "string" || !manifest.source.url.trim()) {
    errors.push("manifest.source: url must be a non-empty string");
  }
  if (typeof manifest.source?.sha256 !== "string" || !manifest.source.sha256.trim()) {
    errors.push("manifest.source: sha256 must be a non-empty string");
  }
  if (!Array.isArray(manifest.source?.notes)) errors.push("manifest.source: notes must be an array");
  const counts = manifest.counts;
  if (counts && counts.champions !== data.champions.length) {
    errors.push(`manifest.counts.champions (${counts.champions}) != actual (${data.champions.length})`);
  }
  if (counts && counts.traits !== data.traits.length) {
    errors.push(`manifest.counts.traits (${counts.traits}) != actual (${data.traits.length})`);
  }
  if (counts && counts.items !== data.items.length) {
    errors.push(`manifest.counts.items (${counts.items}) != actual (${data.items.length})`);
  }
  if (counts && counts.augments !== data.augments.length) {
    errors.push(`manifest.counts.augments (${counts.augments}) != actual (${data.augments.length})`);
  }
  return errors;
}
