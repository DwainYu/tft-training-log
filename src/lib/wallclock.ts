/**
 * Local wall-clock helpers. Every match timestamp is a `YYYY-MM-DDTHH:mm`
 * string without a timezone suffix — see `domain/types.ts` for why.
 */

export type WallClock = string;

const WALL_CLOCK_RE = /^(\d{4})-(\d{2})-(\d{2})(?:[T ](\d{2}):(\d{2}))?$/;
const DAYS_IN_MONTH: number[] = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];

function isLeapYear(year: number): boolean {
  return (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
}

function daysInMonth(year: number, month: number): number {
  if (month === 2 && isLeapYear(year)) return 29;
  return DAYS_IN_MONTH[month - 1];
}

export function toWallClock(date: Date, withTime = true): WallClock {
  const p = (n: number) => n.toString().padStart(2, "0");
  const d = `${date.getFullYear()}-${p(date.getMonth() + 1)}-${p(date.getDate())}`;
  return withTime ? `${d}T${p(date.getHours())}:${p(date.getMinutes())}` : d;
}

export function wallClockNow(): WallClock {
  return toWallClock(new Date());
}

export function dateKey(wallClock: WallClock): string {
  return wallClock.slice(0, 10);
}

export function hourOf(wallClock: WallClock): number | null {
  const m = WALL_CLOCK_RE.exec(wallClock.trim());
  if (!m || m[4] === undefined) return null;
  return Number(m[4]);
}

export function minuteOf(wallClock: WallClock): number | null {
  const m = WALL_CLOCK_RE.exec(wallClock.trim());
  if (!m || m[5] === undefined) return null;
  return Number(m[5]);
}

interface ClockParts {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
}

/** Structural parse: `null` for anything that is not a real calendar instant. */
function partsOf(value: string): ClockParts | null {
  const m = WALL_CLOCK_RE.exec(value.trim());
  if (!m) return null;
  const parts: ClockParts = {
    year: Number(m[1]),
    month: Number(m[2]),
    day: Number(m[3]),
    hour: m[4] === undefined ? 0 : Number(m[4]),
    minute: m[5] === undefined ? 0 : Number(m[5]),
  };
  if (parts.year < 2000 || parts.year > 2100) return null;
  if (parts.month < 1 || parts.month > 12) return null;
  if (parts.day < 1 || parts.day > daysInMonth(parts.year, parts.month)) return null;
  if (parts.hour > 23 || parts.minute > 59) return null;
  return parts;
}

export function isValidWallClock(value: string): boolean {
  return partsOf(value) !== null;
}

/** Parse into a real Date using the runtime's local timezone. */
export function toDate(value: string): Date | null {
  const p = partsOf(value);
  if (!p) return null;
  const date = new Date(p.year, p.month - 1, p.day, p.hour, p.minute);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function secondsBetween(from: string, to: string): number | undefined {
  const a = toDate(from);
  const b = toDate(to);
  if (!a || !b) return undefined;
  const diff = Math.round((b.getTime() - a.getTime()) / 1000);
  return diff >= 0 ? diff : undefined;
}

export function startOfDay(value: string): string {
  return `${value.slice(0, 10)}T00:00`;
}

export function endOfDay(value: string): string {
  return `${value.slice(0, 10)}T23:59`;
}

export function addDays(value: string, days: number): string {
  const date = toDate(value);
  if (!date) return value;
  date.setDate(date.getDate() + days);
  return toWallClock(date);
}

/** Monday-based start of the ISO-ish week containing `value`. */
export function startOfWeek(value: string): string {
  const date = toDate(value) ?? new Date();
  const dow = (date.getDay() + 6) % 7; // 0 = Monday
  date.setDate(date.getDate() - dow);
  date.setHours(0, 0, 0, 0);
  return toWallClock(date);
}

export function endOfWeek(value: string): string {
  const date = toDate(startOfWeek(value));
  if (!date) return value;
  date.setDate(date.getDate() + 6);
  date.setHours(23, 59, 0, 0);
  return toWallClock(date);
}

/** Whole days between two `YYYY-MM-DD` keys (b - a). */
export function daysBetweenDateKeys(a: string, b: string): number {
  const da = toDate(startOfDay(a));
  const db = toDate(startOfDay(b));
  if (!da || !db) return 0;
  return Math.round((db.getTime() - da.getTime()) / 86_400_000);
}

export function formatDate(wallClock: string): string {
  const d = dateKey(wallClock);
  if (d.length !== 10) return wallClock;
  const [, mo, da] = d.split("-");
  return `${mo}/${da}`;
}

export function formatDateWeekday(wallClock: string): string {
  const date = toDate(startOfDay(wallClock));
  if (!date) return wallClock;
  const wd = ["日", "一", "二", "三", "四", "五", "六"][date.getDay()];
  return `周${wd}`;
}

export function formatTime(wallClock: string): string {
  const h = hourOf(wallClock);
  if (h === null) return "";
  const p = (n: number) => n.toString().padStart(2, "0");
  return `${p(h)}:${p(minuteOf(wallClock) ?? 0)}`;
}

export function formatDateTime(wallClock: string): string {
  return [formatDate(wallClock), formatTime(wallClock)].filter(Boolean).join(" ");
}

/* ------------------------------------------------------------------ */
/* 云顶之巅 training window: 12:00 – 22:00 (Beijing time)               */
/* ------------------------------------------------------------------ */

export const TRAINING_WINDOW_START = 12;
export const TRAINING_WINDOW_END = 22;
export const TRAINING_WINDOW_LABEL = "12:00 – 22:00";
export const TRAINING_WINDOW_WARNING = "当前时间不在云顶之巅训练时段";

export function isWithinTrainingWindow(wallClock: string): boolean {
  const h = hourOf(wallClock);
  if (h === null) return true; // date only, nothing to warn about
  return h >= TRAINING_WINDOW_START && h < TRAINING_WINDOW_END;
}

export interface TimeSlotStatBucket {
  key: string;
  label: string;
  start: number;
  end: number;
}

/** Two-hour buckets across the server window, plus an "outside" catch-all. */
export const TIME_SLOTS: TimeSlotStatBucket[] = [
  { key: "12-14", label: "12:00-14:00", start: 12, end: 14 },
  { key: "14-16", label: "14:00-16:00", start: 14, end: 16 },
  { key: "16-18", label: "16:00-18:00", start: 16, end: 18 },
  { key: "18-20", label: "18:00-20:00", start: 18, end: 20 },
  { key: "20-22", label: "20:00-22:00", start: 20, end: 22 },
];

export const OUTSIDE_SLOT_KEY = "off";

export function slotKeyOf(wallClock: string): string {
  const h = hourOf(wallClock);
  if (h === null) return OUTSIDE_SLOT_KEY;
  const slot = TIME_SLOTS.find((s) => h >= s.start && h < s.end);
  return slot ? slot.key : OUTSIDE_SLOT_KEY;
}
