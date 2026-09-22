import { useLiveQuery } from "dexie-react-hooks";
import {
  allOverall,
  allStreak,
  compositionChart,
  mistakeChart,
  recentWindow,
  timeSlotChart,
  trend,
} from "../services/stats-service";
import { formatRateValue, StatCard } from "../components/stats/StatCard";
import { MistakeBarChart } from "../components/stats/MistakeBarChart";
import { PlacementTrendChart, type TrendPoint } from "../components/stats/PlacementTrendChart";
import { StatTable, type StatTableColumn } from "../components/stats/StatTable";
import { EmptyState } from "../components/ui/Badge";
import { LinkButton } from "../components/ui/Button";
import { Panel, PageHeader, PanelHeader } from "../components/ui/Panel";
import { Spinner } from "../components/ui/Spinner";
import { formatNumber } from "../lib/utils";

export function StatisticsPage() {
  const overall = useLiveQuery(allOverall, []);
  const streak = useLiveQuery(allStreak, []);
  const trendSeries = useLiveQuery(() => trend(20), []) as TrendPoint[] | undefined;
  const last10 = useLiveQuery(() => recentWindow(10), []);
  const last20 = useLiveQuery(() => recentWindow(20), []);
  const mistakes = useLiveQuery(mistakeChart, []);
  const compositions = useLiveQuery(compositionChart, []);
  const slots = useLiveQuery(timeSlotChart, []);

  if (overall === undefined) return <Spinner label="计算统计" />;

  if (overall.games === 0) {
    return (
      <>
        <PageHeader title="统计" subtitle="整体表现 · 趋势 · 错误 · 阵容 · 时间段" />
        <Panel>
          <EmptyState
            title="还没有数据可以统计"
            description="记录几局之后，这里会出现平均名次、Top4 率、错误分布等。"
            action={
              <LinkButton to="/matches/new" variant="primary">
                去记录第一局
              </LinkButton>
            }
          />
        </Panel>
      </>
    );
  }

  const trendAvg = trendSeries && trendSeries.length > 0 ? last20?.avgPlacement ?? null : null;

  const compositionColumns: StatTableColumn<NonNullable<typeof compositions>[number]>[] = [
    { key: "comp", label: "阵容", render: (r) => <span className="text-ink-50">{r.composition}</span> },
    { key: "games", label: "场次", align: "right", render: (r) => r.games },
    { key: "avg", label: "平均名次", align: "right", render: (r) => formatNumber(r.avgPlacement, 1) },
    { key: "top4", label: "Top4 率", align: "right", render: (r) => formatRateValue(r.top4Rate) },
    {
      key: "last",
      label: "最近使用",
      align: "right",
      render: (r) => <span className="text-ink-600">{r.lastPlayed.slice(0, 10)}</span>,
    },
  ];

  const slotColumns: StatTableColumn<NonNullable<typeof slots>[number]>[] = [
    { key: "slot", label: "时间段", render: (r) => <span className="text-ink-50">{r.label}</span> },
    { key: "games", label: "场次", align: "right", render: (r) => r.games },
    { key: "avg", label: "平均名次", align: "right", render: (r) => formatNumber(r.avgPlacement, 1) },
    { key: "top4", label: "Top4 率", align: "right", render: (r) => formatRateValue(r.top4Rate) },
  ];

  return (
    <>
      <PageHeader
        title="统计"
        subtitle="只展示数据，不下结论 —— 判断留给你的复盘"
      />

      <div className="flex flex-col gap-4">
        <Panel>
          <PanelHeader title="Overall" subtitle={`${overall.games} 局`} />
          <div className="grid grid-cols-2 gap-3 p-4 sm:grid-cols-3 xl:grid-cols-6">
            <StatCard label="Games" value={String(overall.games)} sub={`${overall.reviewedGames} 局已复盘`} />
            <StatCard label="Avg Placement" value={formatNumber(overall.avgPlacement, 1)} tone="gold" />
            <StatCard
              label="Top4 Rate"
              value={formatRateValue(overall.top4Rate)}
              tone="good"
              sub={`${overall.top4} / ${overall.games}`}
            />
            <StatCard
              label="Win Rate"
              value={formatRateValue(overall.winRate)}
              tone="gold"
              sub={`${overall.wins} 次吃鸡`}
            />
            <StatCard
              label="Bottom4 Rate"
              value={formatRateValue(overall.bottom4Rate)}
              tone="bad"
              sub={`${overall.bottom4} / ${overall.games}`}
            />
            <StatCard
              label="连续训练"
              value={streak !== undefined ? `${streak} 天` : "—"}
              sub="有对局的连续天数"
            />
          </div>
        </Panel>

        <Panel>
          <PanelHeader
            title="最近趋势"
            subtitle="蓝点为 Top4；虚线为近 20 场平均名次"
          />
          <div className="flex flex-col gap-4 p-4">
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              <StatCard
                label="最近 10 场 · 平均名次"
                value={formatNumber(last10?.avgPlacement ?? null, 1)}
                sub={`${last10?.games ?? 0} 局`}
              />
              <StatCard
                label="最近 20 场 · 平均名次"
                value={formatNumber(last20?.avgPlacement ?? null, 1)}
                sub={`${last20?.games ?? 0} 局`}
              />
              <StatCard
                label="最近 20 场 · Top4 率"
                value={formatRateValue(last20?.top4Rate ?? null)}
                tone="good"
              />
            </div>
            <PlacementTrendChart data={trendSeries ?? []} avg={trendAvg} />
          </div>
        </Panel>

        <Panel>
          <PanelHeader
            title="错误统计"
            subtitle="来自每局复盘的 Primary Mistake（未选中的局不计入）"
          />
          <div className="p-4">
            <MistakeBarChart data={mistakes ?? []} />
          </div>
        </Panel>

        <div className="grid gap-4 xl:grid-cols-2">
          <Panel>
            <PanelHeader title="阵容统计" />
            <StatTable
              columns={compositionColumns}
              rows={compositions ?? []}
              empty="还没有填过阵容"
            />
          </Panel>
          <Panel>
            <PanelHeader title="时间段统计" subtitle="云顶之巅 12:00 – 22:00" />
            <StatTable columns={slotColumns} rows={slots ?? []} empty="暂无数据" />
          </Panel>
        </div>
      </div>
    </>
  );
}
