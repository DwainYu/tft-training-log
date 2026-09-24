import { describe, expect, it } from "vitest";
import {
  SESSION_TYPE_LABELS,
  applySessionInput,
  createSession,
  validateSessionInput,
  type SessionInput,
} from "./session";

const input = (over: Partial<SessionInput> = {}): SessionInput => ({
  type: "daily",
  name: "日常训练",
  startDate: "2026-10-13",
  active: true,
  ...over,
});

describe("createSession", () => {
  it("fills identity + timestamps and trims the name", () => {
    const s = createSession({ id: "daily", ...input({ name: "  日常训练 " }) });
    expect(s.id).toBe("daily");
    expect(s.name).toBe("日常训练");
    expect(s.type).toBe("daily");
    expect(s.active).toBe(true);
    expect(s.createdAt).toBe(s.updatedAt);
    expect(s.createdAt).toBeTruthy();
  });

  it("generates an id when none is given (user sessions)", () => {
    const a = createSession(input({ type: "competition", name: "杯赛准备" }));
    const b = createSession(input({ type: "competition", name: "杯赛准备" }));
    expect(a.id).toBeTruthy();
    expect(a.id).not.toBe(b.id);
    expect(a.endDate).toBeUndefined();
  });

  it("keeps an explicit date range for competition sessions", () => {
    const s = createSession(input({ type: "competition", name: "云顶之巅冲榜 S18", startDate: "2026-10-13", endDate: "2026-10-18" }));
    expect(s.startDate).toBe("2026-10-13");
    expect(s.endDate).toBe("2026-10-18");
  });
});

describe("validateSessionInput", () => {
  it("accepts the built-in daily shape", () => {
    expect(validateSessionInput(input())).toEqual([]);
  });

  it("rejects an empty name", () => {
    expect(validateSessionInput(input({ name: "  " }))).toContain("名称不能为空");
  });

  it("rejects an unknown type", () => {
    expect(validateSessionInput(input({ type: "yunding" as never }))).toContain("训练类型不正确");
  });

  it("rejects invalid dates", () => {
    const start = validateSessionInput(input({ startDate: "2026-13-40" }));
    expect(start.some((e) => e.startsWith("开始日期格式不正确"))).toBe(true);
    const end = validateSessionInput(input({ endDate: "10/18" }));
    expect(end.some((e) => e.startsWith("结束日期格式不正确"))).toBe(true);
    const bogus = validateSessionInput(input({ startDate: "not-a-date" }));
    expect(bogus.some((e) => e.startsWith("开始日期格式不正确"))).toBe(true);
  });

  it("rejects endDate before startDate", () => {
    const errors = validateSessionInput(input({ startDate: "2026-10-18", endDate: "2026-10-13" }));
    expect(errors).toContain("结束日期不能早于开始日期");
  });

  it("allows endDate == startDate", () => {
    expect(validateSessionInput(input({ startDate: "2026-10-13", endDate: "2026-10-13" }))).toEqual([]);
  });
});

describe("applySessionInput", () => {
  it("updates fields and touches updatedAt", () => {
    const s = createSession(input());
    const next = applySessionInput(s, { ...input({ name: "改名", endDate: "2026-10-14" }), id: s.id });
    expect(next.name).toBe("改名");
    expect(next.endDate).toBe("2026-10-14");
    expect(next.id).toBe(s.id);
    expect(next.createdAt).toBe(s.createdAt);
    expect(next.updatedAt >= s.updatedAt).toBe(true);
  });
});

describe("type labels", () => {
  it("keeps 云顶之巅 out of the generic type labels", () => {
    // generic categories: event-specific names live in session.name
    expect(SESSION_TYPE_LABELS).toEqual({ daily: "日常", competition: "竞赛" });
    expect(Object.values(SESSION_TYPE_LABELS).join(" ")).not.toContain("云顶之巅");
  });
});
