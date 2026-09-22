import { formatPercent, round } from "../../lib/utils";

/** One metric tile. `value` already formatted; `sub` is a one-line context. */
export function StatCard({
  label,
  value,
  sub,
  tone = "neutral",
}: {
  label: string;
  value: string;
  sub?: string;
  tone?: "neutral" | "gold" | "good" | "bad";
}) {
  const valueClass =
    tone === "gold"
      ? "text-gold-300"
      : tone === "good"
        ? "text-emerald-300"
        : tone === "bad"
          ? "text-red-300"
          : "text-ink-50";

  return (
    <div className="panel flex flex-col gap-1 px-4 py-3">
      <div className="text-[11px] uppercase tracking-[0.12em] text-ink-600">{label}</div>
      <div className={`num text-2xl font-semibold leading-tight ${valueClass}`}>{value}</div>
      {sub && <div className="text-[11px] text-ink-600">{sub}</div>}
    </div>
  );
}

export const formatRateValue = (rate: number | null, digits = 0): string =>
  rate === null ? "—" : formatPercent(rate, digits);

export const formatAvgValue = (avg: number | null, digits = 1): string =>
  avg === null ? "—" : String(round(avg, digits));
