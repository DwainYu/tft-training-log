import { db, type AppSettings } from "../db";
import { DAILY_SESSION_ID } from "../../domain/types";
import { nowIso } from "../../lib/utils";

/**
 * App-level settings, stored as a singleton record (`id: "app"`).
 * Phase 2.5 uses it for the persisted active training session — the context
 * is user-controlled and must survive reloads and browser restarts.
 */
export const settingsRepository = {
  async get(): Promise<AppSettings | undefined> {
    return db.settings.get("app");
  },

  async setActiveSessionId(id: string): Promise<void> {
    const settings = (await db.settings.get("app")) ?? {
      id: "app" as const,
      updatedAt: nowIso(),
    };
    await db.settings.put({ ...settings, activeSessionId: id, updatedAt: nowIso() });
  },

  async resetActiveSessionId(): Promise<void> {
    await this.setActiveSessionId(DAILY_SESSION_ID);
  },
};
