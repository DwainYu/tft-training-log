import { describe, expect, it } from "vitest";
import {
  TIME_SLOTS,
  addDays,
  dateKey,
  daysBetweenDateKeys,
  endOfWeek,
  hourOf,
  isWithinTrainingWindow,
  isValidWallClock,
  secondsBetween,
  slotKeyOf,
  startOfWeek,
  toDate,
  toWallClock,
} from "./wallclock";

describe("wall-clock parsing", () => {
  it("accepts date-only and date-time, rejects junk", () => {
    expect(isValidWallClock("2026-02-05")).toBe(true);
    expect(isValidWallClock("2026-02-05T13:07")).toBe(true);
    expect(isValidWallClock("2026-13-45T13:07")).toBe(false);
    expect(isValidWallClock("昨天")).toBe(false);
    expect(isValidWallClock("")).toBe(false);
  });

  it("round-trips through Date using local time", () => {
    const value = "2026-02-05T13:07";
    const date = toDate(value);
    expect(date).not.toBeNull();
    expect(toWallClock(date!)).toBe(value);
  });

  it("reads hour and date key", () => {
    expect(hourOf("2026-02-05T13:07")).toBe(13);
    expect(hourOf("2026-02-05")).toBeNull();
    expect(dateKey("2026-02-05T13:07")).toBe("2026-02-05");
  });

  it("computes positive durations only", () => {
    expect(secondsBetween("2026-02-05T12:50", "2026-02-05T13:20")).toBe(1800);
    expect(secondsBetween("2026-02-05T13:20", "2026-02-05T12:50")).toBeUndefined();
    expect(secondsBetween("bad", "2026-02-05T12:50")).toBeUndefined();
  });

  it("adds days across month boundaries", () => {
    expect(addDays("2026-02-28T10:00", 1).slice(0, 10)).toBe("2026-03-01");
  });
});

describe("云顶之巅 training window (12:00–22:00)", () => {
  it("accepts the window and rejects outside it", () => {
    expect(isWithinTrainingWindow("2026-02-05T12:00")).toBe(true);
    expect(isWithinTrainingWindow("2026-02-05T21:59")).toBe(true);
    expect(isWithinTrainingWindow("2026-02-05T22:00")).toBe(false);
    expect(isWithinTrainingWindow("2026-02-05T11:59")).toBe(false);
    expect(isWithinTrainingWindow("2026-02-05T03:00")).toBe(false);
  });

  it("does not warn for date-only values", () => {
    expect(isWithinTrainingWindow("2026-02-05")).toBe(true);
  });

  it("buckets hours into two-hour slots", () => {
    expect(TIME_SLOTS).toHaveLength(5);
    expect(slotKeyOf("2026-02-05T12:05")).toBe("12-14");
    expect(slotKeyOf("2026-02-05T19:59")).toBe("18-20");
    expect(slotKeyOf("2026-02-05T23:00")).toBe("off");
    expect(slotKeyOf("2026-02-05")).toBe("off");
  });
});

describe("weeks", () => {
  it("treats Monday as the first day of the week", () => {
    // 2026-02-05 is a Thursday
    expect(startOfWeek("2026-02-05T13:00")).toBe("2026-02-02T00:00");
    expect(endOfWeek("2026-02-05T13:00")).toBe("2026-02-08T23:59");
    expect(startOfWeek("2026-02-02T00:00")).toBe("2026-02-02T00:00");
  });

  it("counts whole days between date keys", () => {
    expect(daysBetweenDateKeys("2026-02-01", "2026-02-05")).toBe(4);
    expect(daysBetweenDateKeys("2026-02-05", "2026-02-01")).toBe(-4);
  });
});
