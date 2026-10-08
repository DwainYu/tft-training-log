import { ArrowDownRight, ArrowUpRight } from "lucide-react";
import { formatPercent, round } from "../../lib/utils";

/**
 * One metric tile. `value` already formatted; `sub` is a one-line context.
 *
 * `emphasis` marks the tile the page should read first (bigger value); `trend`
 * adds a direction arrow to `sub` — the arrow carries the tone, not the text.
 */
export function StatCard({
  label,
  value,
  sub,
  tone = "neutral",
  emphasis = false,
  trend,
}: {
  label: string;
  value: string;
  sub?: string;
  tone?: "neutral" | "gold" | "good" | "bad";
  emphasis?: boolean;
  trend?: { direction: "up" | "down"; tone: "good" | "bad" };
}) {
  const valueClass =
    tone === "gold"
      ? "text-gold-300"
      : tone === "good"
        ? "text-emerald-300"
        : tone === "bad"
          ? "text-red-300"
          : "text-ink-50";

  const TrendArrow = trend ? (
    trend.direction === "down" ? (
      <ArrowDownRight
        size={12}
        className={trend.tone === "good" ? "text-emerald-300" : "text-red-300"}
      />
    ) : (
      <ArrowUpRight
        size={12}
        className={trend.tone === "good" ? "text-emerald-300" : "text-red-300"}
      />
    )
  ) : null;

  return (
    <div className="panel flex flex-col gap-1 px-4 py-3">
      <div className="text-[11px] uppercase tracking-[0.12em] text-ink-600">{label}</div>
      <div
        className={`num font-semibold leading-tight ${emphasis ? "text-3xl" : "text-2xl"} ${valueClass}`}
      >
        {value}
      </div>
      {sub && (
        <div className="flex items-center gap-1 text-[11px] text-ink-600">
          {TrendArrow}
          {trend && <span className="sr-only">{trend.direction === "down" ? "下降" : "上升"}</span>}
          <span>{sub}</span>
        </div>
      )}
    </div>
  );
}

export const formatRateValue = (rate: number | null, digits = 0): string =>
  rate === null ? "—" : formatPercent(rate, digits);

export const formatAvgValue = (avg: number | null, digits = 1): string =>
  avg === null ? "—" : String(round(avg, digits));
