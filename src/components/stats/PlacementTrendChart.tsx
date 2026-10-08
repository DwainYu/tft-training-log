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
import { AXIS_LINE, AXIS_TICK, CHART, CHART_SEMANTIC, MIN_SAMPLES, TOOLTIP_STYLE } from "./chart-theme";
import { ChartEmpty } from "./ChartEmpty";

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
 * tile can express. Every dot is one game and opens that game.
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
          <CartesianGrid stroke={CHART.grid} vertical={false} />
          <XAxis
            dataKey="index"
            tickFormatter={(v: number) => data[v - 1]?.label ?? ""}
            tick={AXIS_TICK}
            axisLine={AXIS_LINE}
            tickLine={false}
            minTickGap={24}
          />
          <YAxis
            domain={[1, 8]}
            ticks={[1, 2, 3, 4, 5, 6, 7, 8]}
            // Without this recharts drops the `1` tick at this height, and the
            // best rank on the scale ends up unlabelled.
            interval={0}
            reversed
            tick={AXIS_TICK}
            axisLine={false}
            tickLine={false}
            width={28}
          />
          <Tooltip
            contentStyle={TOOLTIP_STYLE}
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
              stroke={CHART_SEMANTIC.reference}
              strokeDasharray="4 4"
              strokeOpacity={0.6}
              label={{
                value: `平均 ${avg}`,
                fill: CHART_SEMANTIC.reference,
                fontSize: 11,
                position: "insideTopLeft",
              }}
            />
          )}
          <Line
            type="monotone"
            dataKey="placement"
            name="rank"
            stroke={CHART_SEMANTIC.series}
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
                fill: top4 ? CHART_SEMANTIC.highlight : CHART_SEMANTIC.series,
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
            activeDot={{ r: 5, fill: CHART_SEMANTIC.highlight, stroke: CHART.surface, strokeWidth: 2 }}
            isAnimationActive={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
