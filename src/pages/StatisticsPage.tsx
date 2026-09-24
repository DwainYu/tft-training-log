import { useState } from "react";
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
import { useSession } from "../services/session-context";
import { formatRateValue, StatCard } from "../components/stats/StatCard";
import { MistakeBarChart } from "../components/stats/MistakeBarChart";
import { PlacementTrendChart, type TrendPoint } from "../components/stats/PlacementTrendChart";
import { StatTable, type StatTableColumn } from "../components/stats/StatTable";
import { EmptyState } from "../components/ui/Badge";
import { Select } from "../components/ui/Field";
import { LinkButton } from "../components/ui/Button";
import { Panel, PageHeader, PanelHeader } from "../components/ui/Panel";
import { Spinner } from "../components/ui/Spinner";
import { formatNumber } from "../lib/utils";

type Scope = "current" | "all";

export function StatisticsPage() {
  const { activeSession, activeSessionId, ready } = useSession();
  const [scope, setScope] = useState<Scope>("current");
  // `undefined` = 全部训练; a session id = that training context only.
  const sessionId = scope === "current" && ready ? activeSessionId : undefined;

  const overall = useLiveQuery(() => allOverall(sessionId), [sessionId]);
  const streak = useLiveQuery(() => allStreak(sessionId), [sessionId]);
  const trendSeries = useLiveQuery(() => trend(20, sessionId), [sessionId]) as
    | TrendPoint[]
    | undefined;
  const last10 = useLiveQuery(() => recentWindow(10, sessionId), [sessionId]);
  const last20 = useLiveQuery(() => recentWindow(20, sessionId), [sessionId]);
  const mistakes = useLiveQuery(() => mistakeChart(sessionId), [sessionId]);
  const compositions = useLiveQuery(() => compositionChart(sessionId), [sessionId]);
  const slots = useLiveQuery(() => timeSlotChart(sessionId), [sessionId]);

  if (overall === undefined) return <Spinner label="计算统计" />;

  const scopeControl = (
    <label className="flex items-center gap-2 text-xs text-ink-400">
      数据范围
      <Select
        aria-label="数据范围"
        value={scope}
        onChange={(e) => setScope(e.target.value as Scope)}
        className="w-44 py-1.5 text-xs"
      >
        <option value="current">当前训练（{activeSession?.name ?? "日常训练"}）</option>
        <option value="all">全部训练</option>
      </Select>
    </label>
  );

  if (overall.games === 0) {
    return (
      <>
        <PageHeader
          title="统计"
          subtitle="整体表现 · 趋势 · 错误 · 阵容 · 时间段"
          action={scopeControl}
        />
        <Panel>
          <EmptyState
            title={scope === "current" ? "当前训练下还没有数据可以统计" : "还没有数据可以统计"}
            description={
              scope === "current"
                ? "这个训练下记录几局之后，这里会出现平均名次、Top4 率、错误分布等；也可以切换到「全部训练」。"
                : "记录几局之后，这里会出现平均名次、Top4 率、错误分布等。"
            }
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
        action={scopeControl}
      />

      <div className="flex flex-col gap-4">
        <Panel>
          <PanelHeader
            title={`Overall${scope === "current" ? ` · ${activeSession?.name ?? "日常训练"}` : " · 全部训练"}`}
            subtitle={`${overall.games} 局`}
          />
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
          <Panel className="min-w-0">
            <PanelHeader title="阵容统计" />
            <StatTable
              columns={compositionColumns}
              rows={compositions ?? []}
              empty="还没有填过阵容"
            />
          </Panel>
          <Panel className="min-w-0">
            <PanelHeader title="时间段统计" subtitle="云顶之巅 12:00 – 22:00" />
            <StatTable columns={slotColumns} rows={slots ?? []} empty="暂无数据" />
          </Panel>
        </div>
      </div>
    </>
  );
}
