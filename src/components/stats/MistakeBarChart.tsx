import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

const GRID = "#1e2635";
const TICK = "#8b97ab";
const AMBER = "#d19a2b";

const tooltipStyle = {
  backgroundColor: "#10151f",
  border: "1px solid #232c3d",
  borderRadius: 10,
  fontSize: 12,
  color: "#f2f5fa",
} as const;

export function MistakeBarChart({
  data,
}: {
  data: { key: string; label: string; count: number }[];
}) {
  if (data.length === 0 || data.every((d) => d.count === 0)) {
    return (
      <p className="px-1 py-10 text-center text-xs text-ink-600">
        还没有标记过 Primary Mistake。每局复盘选一个，这里才会开始积累。
      </p>
    );
  }

  return (
    <div className="h-64 w-full overflow-x-auto">
      <ResponsiveContainer width="100%" height="100%" min-width={520}>
        <BarChart data={data} margin={{ top: 8, right: 8, left: -16, bottom: 4 }} barSize={26}>
          <CartesianGrid stroke={GRID} vertical={false} />
          <XAxis
            dataKey="label"
            tick={{ fill: TICK, fontSize: 12 }}
            axisLine={{ stroke: GRID }}
            tickLine={false}
            interval={0}
          />
          <YAxis
            allowDecimals={false}
            tick={{ fill: TICK, fontSize: 12 }}
            axisLine={false}
            tickLine={false}
          />
          <Tooltip
            contentStyle={tooltipStyle}
            cursor={{ fill: "rgba(209,154,43,0.08)" }}
            formatter={(value) => [`${value} 次`, "出现次数"]}
          />
          <Bar dataKey="count" fill={AMBER} radius={[6, 6, 0, 0]} maxBarSize={28} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
