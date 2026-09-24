import { beforeEach, describe, expect, it } from "vitest";
import { matchRepository } from "../data/repository/match-repository";
import { settingsRepository } from "../data/repository/settings-repository";
import { saveMatchInput } from "./match-service";
import {
  createSession,
  deleteSession,
  ensureDefaultSessions,
  getActiveSession,
  getActiveSessionId,
  getSessionById,
  getSessions,
  setActiveSession,
  sessionMatchCounts,
  updateSession,
} from "./session-service";
import { ValidationError } from "../lib/errors";
import { resetDatabase } from "../test/db-helper";

beforeEach(resetDatabase);

async function seedMatch(sessionId?: string) {
  return saveMatchInput({ playedAt: "2026-02-05T13:20", placement: 3, sessionId });
}

describe("ensureDefaultSessions", () => {
  it("seeds the daily + S18 competition sessions on first run", async () => {
    await ensureDefaultSessions();
    const sessions = await getSessions();
    expect(sessions.map((s) => s.id)).toEqual(["daily", "yunding-s18"]);
    const daily = sessions[0];
    const comp = sessions[1];
    expect(daily.type).toBe("daily");
    expect(daily.name).toBe("日常训练");
    expect(daily.active).toBe(true);
    expect(comp.type).toBe("competition");
    expect(comp.name).toBe("云顶之巅冲榜 S18");
    expect(comp.startDate).toBe("2026-10-13");
    expect(comp.endDate).toBe("2026-10-18");
  });

  it("is idempotent and persists the active session", async () => {
    await ensureDefaultSessions();
    await setActiveSession("yunding-s18");
    await ensureDefaultSessions();
    const sessions = await getSessions();
    expect(sessions).toHaveLength(2);
    expect(await getActiveSessionId()).toBe("yunding-s18");
    // survives a settings-store wipe re-read: the value lives in IndexedDB
    expect((await settingsRepository.get())?.activeSessionId).toBe("yunding-s18");
  });

  it("repairs a stale activeSessionId back to daily", async () => {
    await ensureDefaultSessions();
    // simulate a settings record pointing at a session row that is gone
    await settingsRepository.setActiveSessionId("ghost");
    await ensureDefaultSessions();
    expect(await getActiveSessionId()).toBe("daily");
    // and now the pointer is valid again
    await ensureDefaultSessions();
    expect((await settingsRepository.get())?.activeSessionId).toBe("daily");
  });
});

describe("getActiveSessionId / getActiveSession", () => {
  it("falls back to daily when settings are missing (no write required)", async () => {
    expect(await getActiveSessionId()).toBe("daily");
    expect(await getSessionById("daily")).toBeUndefined();
  });

  it("returns the session object once bootstrapped", async () => {
    await ensureDefaultSessions();
    const active = await getActiveSession();
    expect(active?.id).toBe("daily");
  });
});

describe("setActiveSession", () => {
  it("persists the choice and rejects unknown ids", async () => {
    await ensureDefaultSessions();
    await setActiveSession("yunding-s18");
    expect(await getActiveSessionId()).toBe("yunding-s18");
    await expect(setActiveSession("nope")).rejects.toBeInstanceOf(ValidationError);
    expect(await getActiveSessionId()).toBe("yunding-s18");
  });
});

describe("createSession / updateSession", () => {
  it("creates a user session with a generated id", async () => {
    const s = await createSession({
      type: "competition",
      name: "杯赛准备",
      startDate: "2026-11-01",
      endDate: "2026-11-02",
    });
    expect(s.id).toBeTruthy();
    expect(s.active).toBe(true);
    expect(await getSessionById(s.id)).toBeDefined();
  });

  it("rejects a duplicate id", async () => {
    await ensureDefaultSessions();
    try {
      await createSession({ id: "daily", type: "daily", name: "x", startDate: "2026-01-01", active: true });
      expect.unreachable("should have thrown");
    } catch (err) {
      expect(err).toBeInstanceOf(ValidationError);
      expect((err as ValidationError).errors).toContain("Session 已存在：daily");
    }
  });

  it("rejects endDate before startDate", async () => {
    await expect(
      createSession({ type: "daily", name: "x", startDate: "2026-10-18", endDate: "2026-10-13", active: true }),
    ).rejects.toBeInstanceOf(ValidationError);
  });

  it("updates name and range on an existing session", async () => {
    await ensureDefaultSessions();
    const updated = await updateSession("yunding-s18", {
      type: "competition",
      name: "云顶之巅冲榜 S18（改期）",
      startDate: "2026-10-14",
      endDate: "2026-10-19",
      active: true,
    });
    expect(updated.name).toBe("云顶之巅冲榜 S18（改期）");
    expect(updated.endDate).toBe("2026-10-19");
    expect(updated.id).toBe("yunding-s18");
  });

  it("fails cleanly for missing sessions", async () => {
    await expect(updateSession("ghost", { type: "daily", name: "n", startDate: "2026-01-01", active: true })).rejects.toThrow(
      ValidationError,
    );
  });
});

describe("deleteSession + sessionMatchCounts", () => {
  it("refuses to delete a session that still owns matches", async () => {
    await ensureDefaultSessions();
    await seedMatch("yunding-s18");
    await seedMatch("yunding-s18");
    let err: unknown;
    try {
      await deleteSession("yunding-s18");
      expect.unreachable("should have thrown");
    } catch (e) {
      err = e;
    }
    expect(err).toBeInstanceOf(ValidationError);
    expect((err as ValidationError).errors).toContain(
      "该 Session 仍有 2 局比赛，不能删除。请先移动或删除这些比赛。",
    );
    expect(await getSessionById("yunding-s18")).toBeDefined();
    expect(await sessionMatchCounts()).toEqual({ "yunding-s18": 2 });
  });

  it("deletes an empty session and resets a stale active pointer", async () => {
    await ensureDefaultSessions();
    const fresh = await createSession({ type: "daily", name: "休整周", startDate: "2026-12-01", active: true });
    await deleteSession(fresh.id);
    expect(await getSessionById(fresh.id)).toBeUndefined();

    await setActiveSession("yunding-s18");
    await deleteSession("yunding-s18");
    expect(await getActiveSessionId()).toBe("daily");
  });

  it("ignores deleting unknown ids", async () => {
    await ensureDefaultSessions();
    await deleteSession("never-existed");
    expect(await getSessions()).toHaveLength(2);
  });
});

describe("match ↔ session integration", () => {
  it("a new match inherits the active session", async () => {
    await ensureDefaultSessions();
    const inDaily = await seedMatch();
    expect(inDaily.sessionId).toBe("daily");

    await setActiveSession("yunding-s18");
    const inComp = await seedMatch();
    expect(inComp.sessionId).toBe("yunding-s18");
  });

  it("an existing match can move to another session", async () => {
    await ensureDefaultSessions();
    const m = await seedMatch();
    expect(m.sessionId).toBe("daily");
    const moved = await saveMatchInput(
      { playedAt: m.playedAt, placement: m.placement, sessionId: "yunding-s18" },
      m.id,
    );
    expect(moved.sessionId).toBe("yunding-s18");
    expect(await sessionMatchCounts()).toEqual({ "yunding-s18": 1 });
    expect((await matchRepository.get(m.id))?.sessionId).toBe("yunding-s18");
  });
});
