import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { AXIS_LINE, AXIS_TICK, CHART, CHART_SEMANTIC, MIN_SAMPLES, TOOLTIP_STYLE } from "./chart-theme";
import { ChartEmpty } from "./ChartEmpty";
import { DESKTOP_QUERY, useMediaQuery } from "../../lib/use-media-query";

export interface MistakeDatum {
  key: string;
  label: string;
  count: number;
}

/**
 * Answers: "what do I keep getting wrong?"
 *
 * Sorted by count. Every bar drills down into the matches behind it.
 * Below the desktop breakpoint the bars run horizontally: 12 Chinese
 * category labels side by side overlap on a phone, along the Y axis they do not.
 */
export function MistakeBarChart({
  data,
  onSelect,
  loading = false,
}: {
  data: MistakeDatum[];
  /** Drill-down: called with the mistake key of the clicked bar. */
  onSelect?: (key: string) => void;
  loading?: boolean;
}) {
  const wide = useMediaQuery(DESKTOP_QUERY);
  const sampleCount = data.reduce((sum, d) => sum + d.count, 0);

  if (loading || sampleCount < MIN_SAMPLES.mistake) {
    return (
      <ChartEmpty
        loading={loading}
        count={sampleCount}
        min={MIN_SAMPLES.mistake}
        what="错误的分布"
        how="复盘时给每局选一个 Primary Mistake。"
      />
    );
  }

  const select = (payload: unknown) => {
    const key = (payload as { key?: string } | undefined)?.key;
    if (key) onSelect?.(key);
  };

  const tooltip = (
    <Tooltip
      contentStyle={TOOLTIP_STYLE}
      cursor={{ fill: "rgba(209,154,43,0.08)" }}
      formatter={(value) => {
        const total = sampleCount || 1;
        const share = Math.round((Number(value) / total) * 100);
        return [`${String(value)} 次 · ${share}%`, "出现次数"];
      }}
    />
  );

  const bar = (
    <Bar
      dataKey="count"
      fill={CHART_SEMANTIC.series}
      radius={wide ? [6, 6, 0, 0] : [0, 6, 6, 0]}
      maxBarSize={wide ? 28 : 20}
      onClick={onSelect ? (data: unknown) => select(data) : undefined}
    />
  );

  return (
    <div
      className={`w-full ${wide ? "h-56 lg:h-64" : "h-72"} ${
        onSelect ? "[&_.recharts-bar-rectangle]:cursor-pointer" : ""
      }`}
    >
      <ResponsiveContainer width="100%" height="100%">
        {wide ? (
          <BarChart data={data} margin={{ top: 8, right: 8, left: -16, bottom: 4 }} barSize={26}>
            <CartesianGrid stroke={CHART.grid} vertical={false} />
            <XAxis
              dataKey="label"
              tick={AXIS_TICK}
              axisLine={AXIS_LINE}
              tickLine={false}
              interval="preserveStartEnd"
              minTickGap={8}
            />
            <YAxis
              allowDecimals={false}
              tick={AXIS_TICK}
              axisLine={false}
              tickLine={false}
            />
            {tooltip}
            {bar}
          </BarChart>
        ) : (
          <BarChart
            data={data}
            layout="vertical"
            margin={{ top: 8, right: 16, left: 8, bottom: 4 }}
            barSize={18}
          >
            <CartesianGrid stroke={CHART.grid} horizontal={false} />
            <XAxis
              type="number"
              allowDecimals={false}
              tick={AXIS_TICK}
              axisLine={AXIS_LINE}
              tickLine={false}
            />
            <YAxis
              type="category"
              dataKey="label"
              width={76}
              tick={AXIS_TICK}
              axisLine={false}
              tickLine={false}
              interval={0}
            />
            {tooltip}
            {bar}
          </BarChart>
        )}
      </ResponsiveContainer>
    </div>
  );
}
