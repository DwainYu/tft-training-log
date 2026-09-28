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

const GRID = "#1e2635";
const TICK = "#8b97ab";
const GOLD = "#e8b64a";
const BLUE = "#38bdf8";

const tooltipStyle = {
  backgroundColor: "#10151f",
  border: "1px solid #232c3d",
  borderRadius: 10,
  fontSize: 12,
  color: "#f2f5fa",
} as const;

export interface TrendPoint {
  index: number;
  label: string;
  placement: number;
  top4: 0 | 1;
  id: string;
}

/** Rank trend, 1st place on top; the dashed reference line is the window average. */
export function PlacementTrendChart({
  data,
  avg,
}: {
  data: TrendPoint[];
  /** Average placement of the shown window — drawn as a reference line. */
  avg: number | null;
}) {
  if (data.length === 0) {
    return <p className="px-1 py-10 text-center text-xs text-ink-600">暂无数据</p>;
  }

  return (
    <div className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 8, right: 8, left: -16, bottom: 4 }}>
          <CartesianGrid stroke={GRID} vertical={false} />
          <XAxis
            dataKey="index"
            tickFormatter={(v: number) => data[v - 1]?.label ?? ""}
            tick={{ fill: TICK, fontSize: 11 }}
            axisLine={{ stroke: GRID }}
            tickLine={false}
            minTickGap={24}
          />
          <YAxis
            domain={[1, 8]}
            ticks={[1, 2, 3, 4, 5, 6, 7, 8]}
            reversed
            tick={{ fill: TICK, fontSize: 11 }}
            axisLine={false}
            tickLine={false}
            width={28}
          />
          <Tooltip
            contentStyle={tooltipStyle}
            labelFormatter={(label, payload) => {
              const point = payload?.[0]?.payload as TrendPoint | undefined;
              return point?.label ?? String(label);
            }}
            formatter={(value) => [`第 ${String(value)} 名`, "名次"]}
          />
          {avg !== null && (
            <ReferenceLine
              y={avg}
              stroke={GOLD}
              strokeDasharray="4 4"
              strokeOpacity={0.5}
              label={{ value: `平均 ${avg}`, fill: GOLD, fontSize: 11, position: "insideTopLeft" }}
            />
          )}
          <Line
            type="monotone"
            dataKey="placement"
            name="rank"
            stroke={GOLD}
            strokeWidth={2}
            dot={(props) => {
              const { cx, cy, payload } = props;
              if (cx == null || cy == null) return null;
              return (
                <circle
                  cx={cx}
                  cy={cy}
                  r={3}
                  fill={payload?.top4 === 1 ? BLUE : GOLD}
                  strokeWidth={0}
                />
              );
            }}
            activeDot={{ r: 5, fill: BLUE, stroke: "#10151f", strokeWidth: 2 }}
            isAnimationActive={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
