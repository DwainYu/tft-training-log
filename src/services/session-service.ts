import { matchRepository } from "../data/repository/match-repository";
import { settingsRepository } from "../data/repository/settings-repository";
import { trainingSessionRepository } from "../data/repository/training-session-repository";
import {
  applySessionInput,
  createSession as createSessionDomain,
  validateSessionInput,
  type SessionInput,
} from "../domain/session/session";
import { DAILY_SESSION_ID, type TrainingSession } from "../domain/types";
import { ValidationError } from "../lib/errors";
import { dateKey, wallClockNow } from "../lib/wallclock";

/**
 * Training-session service. The UI only ever calls this module; the
 * repositories underneath stay opaque to components.
 *
 * Active session is user-controlled context (persisted in `settings`), never
 * a time-based implicit switch: reaching a competition's startDate does not
 * flip `daily` → `competition` on its own.
 */

/**
 * Initial sessions, created on first run. Dates here are the player's
 * personal competition configuration — editable via `updateSession`, not
 * part of the domain logic.
 */
export function defaultSessions(): SessionInput[] {
  return [
    {
      id: DAILY_SESSION_ID,
      type: "daily",
      name: "日常训练",
      startDate: dateKey(wallClockNow()),
      active: true,
    },
    {
      id: "yunding-s18",
      type: "competition",
      name: "云顶之巅冲榜 S18",
      description: "S18 云顶之巅冲榜训练周期（个人赛事配置，可编辑或删除）",
      startDate: "2026-10-13",
      endDate: "2026-10-18",
      active: true,
    },
  ];
}

/** Idempotent bootstrap: seed the two default sessions + settings record. */
export async function ensureDefaultSessions(): Promise<void> {
  if ((await trainingSessionRepository.all()).length === 0) {
    await trainingSessionRepository.bulkPut(
      defaultSessions().map((input) =>
        createSessionDomain({ ...input, active: input.active ?? true }),
      ),
    );
  }
  const activeId = (await settingsRepository.get())?.activeSessionId;
  const known = activeId ? await trainingSessionRepository.get(activeId) : undefined;
  if (!known) {
    await settingsRepository.setActiveSessionId(DAILY_SESSION_ID);
  }
}

export async function getSessions(): Promise<TrainingSession[]> {
  const sessions = await trainingSessionRepository.all();
  return sessions.sort((a, b) => a.createdAt.localeCompare(b.createdAt));
}

export async function getSessionById(id: string): Promise<TrainingSession | undefined> {
  return trainingSessionRepository.get(id);
}

export interface CreateSessionInput extends Omit<SessionInput, "active"> {
  active?: boolean;
}

/** Create a session (id generated unless one is supplied). */
export async function createSession(input: CreateSessionInput): Promise<TrainingSession> {
  const errors = validateSessionInput(input);
  if (errors.length) throw new ValidationError(errors);
  const session = createSessionDomain({ ...input, active: input.active ?? true });
  if (await trainingSessionRepository.get(session.id)) {
    throw new ValidationError([`Session 已存在：${session.id}`]);
  }
  return trainingSessionRepository.add(session);
}

export async function updateSession(
  id: string,
  input: Omit<SessionInput, "id">,
): Promise<TrainingSession> {
  const existing = await trainingSessionRepository.get(id);
  if (!existing) throw new ValidationError([`训练 Session 不存在：${id}`]);
  const errors = validateSessionInput(input);
  if (errors.length) throw new ValidationError(errors);
  const next = applySessionInput(existing, { id, ...input });
  await trainingSessionRepository.put(next);
  return next;
}

/**
 * Delete rule: a session that still owns matches is not deletable — move or
 * delete the matches first, so no orphan records can appear.
 */
export async function deleteSession(id: string): Promise<void> {
  const existing = await trainingSessionRepository.get(id);
  if (!existing) return;
  const owned = (await matchRepository.all()).filter((m) => m.sessionId === id);
  if (owned.length > 0) {
    throw new ValidationError([
      `该 Session 仍有 ${owned.length} 局比赛，不能删除。请先移动或删除这些比赛。`,
    ]);
  }
  await trainingSessionRepository.remove(id);
  if (id === (await settingsRepository.get())?.activeSessionId) {
    await settingsRepository.setActiveSessionId(DAILY_SESSION_ID);
  }
}

export async function getActiveSessionId(): Promise<string> {
  const id = (await settingsRepository.get())?.activeSessionId;
  if (id && (await trainingSessionRepository.get(id))) return id;
  // Missing settings record or stale id → fall back to the built-in session.
  return DAILY_SESSION_ID;
}

export async function getActiveSession(): Promise<TrainingSession | undefined> {
  return trainingSessionRepository.get(await getActiveSessionId());
}

/** Set the active session (persisted). Unknown ids are rejected. */
export async function setActiveSession(id: string): Promise<void> {
  const session = await trainingSessionRepository.get(id);
  if (!session) throw new ValidationError([`训练 Session 不存在：${id}`]);
  await settingsRepository.setActiveSessionId(id);
}

/** Match count per session id — used by the session manager UI + delete guard. */
export async function sessionMatchCounts(): Promise<Record<string, number>> {
  const counts: Record<string, number> = {};
  for (const m of await matchRepository.all()) {
    const key = m.sessionId ?? DAILY_SESSION_ID;
    counts[key] = (counts[key] ?? 0) + 1;
  }
  return counts;
}
