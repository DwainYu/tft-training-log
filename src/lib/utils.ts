/** Small helpers with no dependencies — shared by domain and UI. */

export function createId(): string {
  const c = globalThis.crypto;
  if (c && typeof c.randomUUID === "function") return c.randomUUID();
  return `id-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

export function nowIso(): string {
  return new Date().toISOString();
}

/** Split a free-text list ("A / B", "A,B、C") into trimmed entries. */
export function parseList(value: string | undefined): string[] {
  if (!value) return [];
  return value
    .split(/[/,、，;；\n]+/)
    .map((s) => s.trim())
    .filter(Boolean);
}

export function formatList(values: string[] | undefined): string {
  return (values ?? []).join(" / ");
}

export function clampNumber(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

export function round(value: number, digits = 2): number {
  const f = 10 ** digits;
  return Math.round(value * f) / f;
}

/** 0.75 -> "75%" ; null/NaN -> "—" */
export function formatPercent(ratio: number | null | undefined, digits = 0): string {
  if (ratio === null || ratio === undefined || Number.isNaN(ratio)) return "—";
  return `${(ratio * 100).toFixed(digits)}%`;
}

export function formatNumber(value: number | null | undefined, digits = 2): string {
  if (value === null || value === undefined || Number.isNaN(value)) return "—";
  return value.toFixed(digits);
}

export function formatDuration(seconds: number | null | undefined): string {
  if (seconds === null || seconds === undefined || Number.isNaN(seconds)) return "—";
  const m = Math.floor(seconds / 60);
  const s = Math.round(seconds % 60);
  return `${m}分${s.toString().padStart(2, "0")}秒`;
}
