import type { CompositionUsage } from "../../domain/types";
import { maxIso, minIso } from "../../domain/composition/composition";
import { db } from "../db";

/**
 * Derived per-composition usage counters (Phase 3A). Rows are written from
 * the match-service create path and can always be recomputed from `matches`,
 * which is why nothing else reads or repairs them ad hoc.
 */
export interface CompositionUsageRepository {
  get(compositionKey: string): Promise<CompositionUsage | undefined>;
  all(): Promise<CompositionUsage[]>;
  put(record: CompositionUsage): Promise<void>;
  bulkPut(records: CompositionUsage[]): Promise<void>;
  clear(): Promise<void>;
  /** Insert-and-increment: one row per key, `usageCount + 1` when it exists. */
  recordUse(compositionKey: string, usedAt: string): Promise<void>;
  /** Replace every row with `records` (used by rebuilds). */
  replaceAll(records: CompositionUsage[]): Promise<void>;
}

export const compositionUsageRepository: CompositionUsageRepository = {
  async get(compositionKey) {
    return db.compositionUsage.get(compositionKey);
  },

  async all() {
    return db.compositionUsage.toArray();
  },

  async put(record) {
    await db.compositionUsage.put(record);
  },

  async bulkPut(records) {
    await db.compositionUsage.bulkPut(records);
  },

  async clear() {
    await db.compositionUsage.clear();
  },

  async recordUse(compositionKey, usedAt) {
    const existing = await db.compositionUsage.get(compositionKey);
    if (!existing) {
      await db.compositionUsage.put({
        compositionKey,
        usageCount: 1,
        firstUsedAt: usedAt,
        lastUsedAt: usedAt,
      });
      return;
    }
    await db.compositionUsage.put({
      ...existing,
      usageCount: existing.usageCount + 1,
      firstUsedAt: minIso(existing.firstUsedAt, usedAt),
      lastUsedAt: maxIso(existing.lastUsedAt, usedAt),
    });
  },

  async replaceAll(records) {
    // Upsert first, delete the leftovers second: a rebuild should never leave
    // the table empty half-way through.
    if (records.length > 0) await db.compositionUsage.bulkPut(records);
    const keep = new Set(records.map((r) => r.compositionKey));
    const stale = (await db.compositionUsage.toArray())
      .filter((r) => !keep.has(r.compositionKey))
      .map((r) => r.compositionKey);
    if (stale.length > 0) await db.compositionUsage.bulkDelete(stale);
  },
};
