import { useMemo } from "react";
import {
  CartesianGrid,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { chartTheme, MIN_SAMPLES } from "./chart-theme";
import { ChartEmpty } from "./ChartEmpty";
import { useTheme } from "../../lib/theme";

export interface TrendPoint {
  index: number;
  /** `MM-DD` — the axis label. */
  label: string;
  /** Full wall-clock stamp, so the tooltip can name one exact game. */
  playedAt: string;
  placement: number;
  top4: 0 | 1;
  /** Drill-down target: a point always belongs to exactly one match. */
  id: string;
}

/**
 * Rank trend, 1st place on top; the dashed reference line is the window average.
 *
 * Answers: "am I playing better lately?" — a direction, which no single KPI
 * tile can express. Every dot is one game and opens that game. Dates on the
 * x axis are labelled once per day, on that day's first game.
 */
export function PlacementTrendChart({
  data,
  avg,
  onSelectMatch,
  loading = false,
}: {
  data: TrendPoint[];
  /** Average placement of the shown window — drawn as a reference line. */
  avg: number | null;
  /** Drill-down: called with `TrendPoint.id`. */
  onSelectMatch?: (matchId: string) => void;
  loading?: boolean;
}) {
  // Literal SVG colours for the active theme; the useTheme() dependency makes
  // a toggle re-render the chart. Hooks stay above the early return.
  const { dark } = useTheme();
  const t = useMemo(() => chartTheme(dark), [dark]);

  if (loading || data.length < MIN_SAMPLES.trend) {
    return (
      <ChartEmpty
        loading={loading}
        count={data.length}
        min={MIN_SAMPLES.trend}
        what="最近的名次走势"
        how="右下角「快速记录」记一局，或到「新增对局」补一局。"
      />
    );
  }

  return (
    <div className="h-48 w-full sm:h-56 lg:h-64">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 8, right: 8, left: -16, bottom: 4 }}>
          <CartesianGrid stroke={t.CHART.grid} vertical={false} />
          <XAxis
            dataKey="index"
            // Several games land on the same day. A date is only labelled on
            // its first game, so the axis reads "10-04 10-05 10-06" instead of
            // repeating "10-05" for every point on that day.
            tickFormatter={(v: number) => {
              const point = data[v - 1];
              if (!point) return "";
              const prev = data[v - 2];
              return prev && prev.label === point.label ? "" : point.label;
            }}
            tick={t.AXIS_TICK}
            axisLine={t.AXIS_LINE}
            tickLine={false}
            // Keep the window's first and last tick visible even when the
            // dedupe above blanks a middle label.
            interval="preserveStartEnd"
            minTickGap={24}
          />
          <YAxis
            domain={[1, 8]}
            ticks={[1, 2, 3, 4, 5, 6, 7, 8]}
            // Without this recharts drops the `1` tick at this height, and the
            // best rank on the scale ends up unlabelled.
            interval={0}
            reversed
            tick={t.AXIS_TICK}
            axisLine={false}
            tickLine={false}
            width={28}
          />
          <Tooltip
            contentStyle={t.TOOLTIP_STYLE}
            labelFormatter={(_label, payload) => {
              const point = payload?.[0]?.payload as TrendPoint | undefined;
              if (!point) return "";
              const time = point.playedAt.slice(11, 16);
              return `第 ${point.index} 局 · ${point.label}${time ? ` ${time}` : ""}`;
            }}
            formatter={(value) => [`第 ${String(value)} 名`, "名次"]}
          />
          {avg !== null && (
            <ReferenceLine
              y={avg}
              stroke={t.CHART_SEMANTIC.reference}
              strokeDasharray="4 4"
              strokeOpacity={0.6}
              label={{
                value: `平均 ${avg}`,
                fill: t.CHART_SEMANTIC.reference,
                fontSize: 11,
                position: "insideTopLeft",
              }}
            />
          )}
          <Line
            type="monotone"
            dataKey="placement"
            name="rank"
            stroke={t.CHART_SEMANTIC.series}
            strokeWidth={2}
            dot={(props: { cx?: number; cy?: number; payload?: TrendPoint }) => {
              const { cx, cy, payload } = props;
              if (cx == null || cy == null || !payload) return null;
              const top4 = payload.top4 === 1;
              const title = `${payload.label} ${payload.playedAt.slice(11, 16)} · 第 ${payload.placement} 名${top4 ? " · Top4" : ""}`;
              const shared = {
                cx,
                cy,
                r: onSelectMatch ? 4 : 3,
                fill: top4 ? t.CHART_SEMANTIC.highlight : t.CHART_SEMANTIC.series,
                strokeWidth: 0,
              };
              if (!onSelectMatch) return <circle {...shared} />;
              return (
                <circle
                  {...shared}
                  role="button"
                  tabIndex={0}
                  aria-label={`${title}（查看该局）`}
                  style={{ cursor: "pointer" }}
                  onClick={() => onSelectMatch(payload.id)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      onSelectMatch(payload.id);
                    }
                  }}
                >
                  <title>{title}</title>
                </circle>
              );
            }}
            activeDot={{ r: 5, fill: t.CHART_SEMANTIC.highlight, stroke: t.CHART.surface, strokeWidth: 2 }}
            isAnimationActive={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
