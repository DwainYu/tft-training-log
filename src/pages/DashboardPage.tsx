import { Link } from "react-router-dom";
import { useLiveQuery } from "dexie-react-hooks";
import { ArrowRight, CalendarClock, Flame, Play } from "lucide-react";
import { allOverall, allStreak, commonMistakes, recentWindow } from "../services/stats-service";
import { currentGoals } from "../services/training-service";
import { recentMatches } from "../services/match-service";
import { goalStatusLabel } from "../domain/training/training-goal";
import { mistakeLabel } from "../domain/labels";
import { placementTone } from "../domain/match/match";
import { formatDuration } from "../lib/utils";
import { formatDateWeekday, formatTime } from "../lib/wallclock";
import { AddMatchButton } from "../components/matches/AddMatchButton";
import { formatRateValue, StatCard } from "../components/stats/StatCard";
import { formatNumber } from "../lib/utils";
import { Badge } from "../components/ui/Badge";
import { LinkButton } from "../components/ui/Button";
import { EmptyState } from "../components/ui/Badge";
import { Panel, PageHeader, PanelHeader } from "../components/ui/Panel";
import { Spinner } from "../components/ui/Spinner";

export function DashboardPage() {
  const overall = useLiveQuery(allOverall, []);
  const streak = useLiveQuery(allStreak, []);
  const last10 = useLiveQuery(() => recentWindow(10), []);
  const recent = useLiveQuery(() => recentMatches(8), []);
  const goals = useLiveQuery(currentGoals, []);
  const mistakes = useLiveQuery(() => commonMistakes(3), []);

  if (overall === undefined || recent === undefined) return <Spinner label="读取训练状态" />;

  const goal = goals?.[0];
  const noData = overall.games === 0;

  return (
    <>
      <PageHeader
        title="训练状态"
        subtitle="云顶之巅 · 数据全部保存在本机"
        action={
          <div className="flex items-center gap-2">
            <AddMatchButton compact />
            <LinkButton to="/matches/new">新增对局</LinkButton>
          </div>
        }
      />

      <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-6">
        <StatCard label="总场次" value={String(overall.games)} />
        <StatCard label="平均名次" value={formatNumber(overall.avgPlacement, 1)} tone="gold" />
        <StatCard label="Top4 率" value={formatRateValue(overall.top4Rate)} tone="good" />
        <StatCard label="吃鸡" value={String(overall.wins)} tone={overall.wins > 0 ? "gold" : "neutral"} />
        <StatCard label="Win Rate" value={formatRateValue(overall.winRate)} tone="gold" />
        <StatCard
          label="连续训练"
          value={`${streak ?? "—"} 天`}
          sub={streak ? "有对局的连续天数" : "记录今天的第一局"}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="flex flex-col gap-4 lg:col-span-2">
          <Panel>
            <PanelHeader
              title="最近对局"
              subtitle="最新 8 局"
              action={<LinkButton to="/matches" size="sm">全部对局 <ArrowRight size={12} /></LinkButton>}
            />
            {noData ? (
              <EmptyState
                title="还没有记录任何对局"
                description="打完一局点右上角「新增对局」，或从侧边栏一键快速记录。1–2 分钟即可记完。"
                action={
                  <LinkButton to="/matches/new" variant="primary">
                    <Play size={14} />
                    记录第一局
                  </LinkButton>
                }
              />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="border-b border-line text-[11px] uppercase tracking-wide text-ink-600">
                    <tr>
                      <th className="px-3 py-2 font-medium">Date</th>
                      <th className="px-3 py-2 font-medium">名次</th>
                      <th className="px-3 py-2 font-medium">阵容</th>
                      <th className="px-3 py-2 font-medium">等级</th>
                      <th className="px-3 py-2 font-medium">时长</th>
                      <th className="px-3 py-2 font-medium">复盘</th>
                      <th className="px-3 py-2 font-medium">最大问题</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recent.map((m) => {
                      const tone = placementTone(m.placement);
                      return (
                        <tr key={m.id} className="border-b border-line/60 last:border-0 hover:bg-base-800/50">
                          <td className="px-3 py-2">
                            <Link to={`/matches/${m.id}`} className="num text-ink-50 hover:text-gold-300">
                              {formatDateWeekday(m.playedAt)} {formatTime(m.playedAt)}
                            </Link>
                          </td>
                          <td className="px-3 py-2">
                            <Badge tone={tone === "gold" ? "gold" : tone === "good" ? "good" : "bad"}>
                              第 {m.placement} 名
                            </Badge>
                          </td>
                          <td className="max-w-[16ch] truncate px-3 py-2 text-ink-200">
                            {m.composition ?? <span className="text-ink-600">未填</span>}
                          </td>
                          <td className="num px-3 py-2 text-ink-400">{m.finalLevel ?? "—"}</td>
                          <td className="num px-3 py-2 text-ink-400">
                            {m.durationSeconds !== undefined ? formatDuration(m.durationSeconds) : "—"}
                          </td>
                          <td className="px-3 py-2">
                            {m.reviewed ? (
                              <Badge tone="good">已复盘</Badge>
                            ) : (
                              <Badge tone="muted">未复盘</Badge>
                            )}
                          </td>
                          <td className="px-3 py-2">
                            {m.primaryMistake ? (
                              <Badge tone="neutral">{mistakeLabel(m.primaryMistake)}</Badge>
                            ) : (
                              <span className="text-xs text-ink-600">—</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </Panel>

          <div className="grid gap-4 sm:grid-cols-2">
            <StatCard
              label="最近 10 场 · 平均名次"
              value={formatNumber(last10?.avgPlacement ?? null, 1)}
              sub={`${last10?.games ?? 0} 局`}
            />
            <StatCard
              label="最近 10 场 · Top4 率"
              value={formatRateValue(last10?.top4Rate ?? null)}
              tone="good"
            />
          </div>
        </div>

        <div className="flex flex-col gap-4">
          <Panel>
            <PanelHeader
              title="当前训练目标"
              action={
                goal ? (
                  <Badge tone="gold">{goalStatusLabel(goal.status)}</Badge>
                ) : (
                  <Badge tone="muted">无</Badge>
                )
            }
            />
            {goal ? (
              <div className="flex flex-col gap-2 p-4">
                <div className="text-base font-semibold text-ink-50">{goal.title}</div>
                {goal.description && <p className="text-xs leading-relaxed text-ink-400">{goal.description}</p>}
                <div className="flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-ink-600">
                  <span className="flex items-center gap-1">
                    <CalendarClock size={12} /> {goal.startDate}
                    {goal.endDate ? ` – ${goal.endDate}` : ""}
                  </span>
                  {goal.relatedMistakes && goal.relatedMistakes.length > 0 && (
                    <span>
                      相关：{goal.relatedMistakes.map((m) => mistakeLabel(m)).join(" / ")}
                    </span>
                  )}
                </div>
                <div className="mt-1 flex gap-2">
                  <LinkButton to="/goals" size="sm">管理目标</LinkButton>
                </div>
              </div>
            ) : (
              <div className="p-4">
                <p className="text-xs leading-relaxed text-ink-600">
                  还没有进行中的训练目标。把反复出现的错误变成一个明确、可执行的练习目标。
                </p>
                <div className="mt-3">
                  <LinkButton to="/goals" variant="primary" size="sm">
                    创建目标
                  </LinkButton>
                </div>
              </div>
            )}
          </Panel>

          <Panel>
            <PanelHeader title="高频问题" subtitle="按 Primary Mistake 统计" />
            {mistakes && mistakes.length > 0 ? (
              <div className="flex flex-wrap gap-2 p-4">
                {mistakes.map((mm) => (
                  <Badge key={mm.type} tone="bad">
                    {mistakeLabel(mm.type as never)} × {mm.count}
                  </Badge>
                ))}
              </div>
            ) : (
              <p className="px-4 py-4 text-xs text-ink-600">复盘并标记 Primary Mistake 后，这里会出现高频问题。</p>
            )}
          </Panel>

          <Panel className="flex items-center gap-3 p-4">
            <Flame size={20} className="text-gold-300" />
            <div className="text-xs leading-relaxed text-ink-400">
              训练时段 <span className="num text-ink-200">12:00 – 22:00</span>。数据保存在本机
              IndexedDB，可随时在「数据」页导出备份。
            </div>
          </Panel>
        </div>
      </div>
    </>
  );
}
