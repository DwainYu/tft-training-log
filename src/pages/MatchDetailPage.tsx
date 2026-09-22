import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useLiveQuery } from "dexie-react-hooks";
import {
  CalendarClock,
  ChevronLeft,
  Pencil,
  Sparkles,
  Target,
  Trash2,
} from "lucide-react";
import { deleteMatch, getMatchBundle } from "../services/match-service";
import { currentGoals } from "../services/training-service";
import { decisionLabel, mistakeLabel } from "../domain/labels";
import { durationOf, isBottom4, isTop4, isWin, placementTone } from "../domain/match/match";
import { formatDateWeekday, formatTime } from "../lib/wallclock";
import { formatDuration } from "../lib/utils";
import { Badge, EmptyState } from "../components/ui/Badge";
import { Button, LinkButton } from "../components/ui/Button";
import { Modal } from "../components/ui/Modal";
import { Panel, PageHeader, PanelHeader } from "../components/ui/Panel";
import { Spinner } from "../components/ui/Spinner";
import { useToast } from "../components/ui/Toast";

export function MatchDetailPage() {
  const { id = "" } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const toast = useToast();
  const [confirm, setConfirm] = useState(false);

  const bundle = useLiveQuery(() => getMatchBundle(id), [id]);
  const goals = useLiveQuery(() => currentGoals(), []);

  if (bundle === undefined) return <Spinner label="读取对局" />;
  if (bundle === null) {
    return (
      <>
        <PageHeader title="对局详情" />
        <Panel>
          <EmptyState
            title="找不到这局对局"
            description="它可能已经被删除，或链接失效。"
            action={<LinkButton to="/matches">返回对局列表</LinkButton>}
          />
        </Panel>
      </>
    );
  }

  const { match, review, decisions } = bundle;
  const tone = placementTone(match.placement);
  const relatedGoals = (goals ?? []).filter(
    (g) => match.primaryMistake && (g.relatedMistakes ?? []).includes(match.primaryMistake),
  );

  return (
    <>
      <div className="mb-4">
        <Link
          to="/matches"
          className="inline-flex items-center gap-1 text-xs text-ink-600 hover:text-ink-200"
        >
          <ChevronLeft size={13} />
          对局列表
        </Link>
      </div>

      <PageHeader
        title={`第 ${match.placement} 名 · ${match.composition ?? "未填阵容"}`}
        subtitle={`${match.playedAt.slice(0, 10)} ${formatDateWeekday(match.playedAt)} · ${formatTime(match.playedAt) || "时间未填"}`}
        action={
          <>
            <LinkButton to={`/matches/${match.id}/review`} variant="primary">
              <Sparkles size={15} />
              {match.reviewed ? "查看复盘" : "开始复盘"}
            </LinkButton>
            <LinkButton to={`/matches/${match.id}/edit`}>
              <Pencil size={14} />
              编辑
            </LinkButton>
            <Button variant="danger" onClick={() => setConfirm(true)}>
              <Trash2 size={14} />
              删除
            </Button>
          </>
        }
      />

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="flex flex-col gap-4 lg:col-span-2">
          <Panel>
            <PanelHeader
              title="基础信息"
              action={
                <>
                  <Badge tone={tone === "gold" ? "gold" : tone === "good" ? "good" : "bad"}>
                    第 {match.placement} 名
                  </Badge>
                  {isWin(match) && <Badge tone="gold">吃鸡</Badge>}
                  {isTop4(match) && <Badge tone="good">Top4</Badge>}
                  {isBottom4(match) && <Badge tone="bad">Bottom4</Badge>}
                </>
              }
            />
            <dl className="grid grid-cols-2 gap-x-4 gap-y-3 p-4 sm:grid-cols-4">
              <Fact label="日期" value={match.playedAt.slice(0, 10)} />
              <Fact label="开始" value={formatTime(match.startedAt ?? "") || "—"} />
              <Fact label="结束" value={formatTime(match.endedAt ?? match.playedAt) || "—"} />
              <Fact
                label="时长"
                value={
                  durationOf(match) !== undefined ? formatDuration(durationOf(match)) : "—"
                }
              />
              <Fact label="最终等级" value={match.finalLevel ?? "—"} />
              <Fact label="最终血量" value={match.finalHealth ?? "—"} />
              <Fact label="剩余金币" value={match.totalGold ?? "—"} />
              <Fact
                label="复盘状态"
                value={match.reviewed ? "已复盘" : review ? "复盘中" : "未复盘"}
              />
            </dl>
            {match.notes && (
              <p className="border-t border-line px-4 py-3 text-sm text-ink-200">{match.notes}</p>
            )}
          </Panel>

          <Panel>
            <PanelHeader title="阵容 / 装备 / 强化符文" />
            <div className="flex flex-col gap-3 p-4">
              <TextRow label="最终阵容" value={match.composition} />
              <ChipRow label="主要羁绊" values={match.traits} />
              <ChipRow label="核心棋子" values={match.coreUnits} />
              <ChipRow label="核心装备" values={match.coreItems} />
              <ChipRow label="强化符文" values={match.augments} />
            </div>
          </Panel>

          <Panel>
            <PanelHeader
              title="关键决策"
              subtitle="回合 · 类型 · 当时状态 · 决定 · 原因 · 结果 · 回看"
              action={<Badge tone="muted">{decisions.length} 条</Badge>}
            />
            {decisions.length === 0 ? (
              <EmptyState
                title="还没有记录决策"
                description="在复盘前记下 2 – 3 个关键决策，统计才能找出重复出现的问题。"
                action={
                  <LinkButton to={`/matches/${match.id}/review`}>去复盘页添加</LinkButton>
                }
              />
            ) : (
              <ul className="divide-y divide-line">
                {decisions.map((d) => (
                  <li key={d.id} className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <span className="num rounded bg-base-800 px-1.5 py-0.5 text-xs text-ink-200">
                        {d.round}
                      </span>
                      <span className="text-xs text-gold-300">{decisionLabel(d.type)}</span>
                      {d.situation && (
                        <span className="truncate text-xs text-ink-600">{d.situation}</span>
                      )}
                    </div>
                    <p className="mt-1.5 text-sm text-ink-50">{d.decision}</p>
                    {d.reasoning && <p className="text-xs text-ink-400">原因：{d.reasoning}</p>}
                    {d.result && <p className="text-xs text-ink-400">结果：{d.result}</p>}
                  </li>
                ))}
              </ul>
            )}
          </Panel>
        </div>

        <div className="flex flex-col gap-4">
          <Panel>
            <PanelHeader title="复盘结论" />
            {review ? (
              <div className="flex flex-col gap-3 p-4 text-sm">
                <div>
                  <div className="text-[11px] uppercase tracking-wide text-ink-600">
                    Primary Mistake
                  </div>
                  <div className="mt-1">
                    <Badge tone="bad">{mistakeLabel(review.primaryMistake ?? match.primaryMistake)}</Badge>
                  </div>
                </div>
                <TextRow label="最大问题" value={review.biggestMistake} />
                <TextRow label="做得最好" value={review.bestDecision} />
                <TextRow label="下局练习" value={review.nextGameFocus} />
                <LinkButton to={`/matches/${match.id}/review`} size="sm" className="mt-1">
                  打开完整复盘
                </LinkButton>
              </div>
            ) : (
              <EmptyState
                title="这局还没有复盘"
                description="开局 / 中期 / 后期 / 结论，四段话就够。"
                action={
                  <LinkButton to={`/matches/${match.id}/review`} variant="primary">
                    开始复盘
                  </LinkButton>
                }
              />
            )}
          </Panel>

          <Panel>
            <PanelHeader title="相关训练目标" action={<Target size={14} className="text-ink-600" />} />
            {relatedGoals.length > 0 ? (
              <ul className="flex flex-col gap-2 p-4">
                {relatedGoals.map((g) => (
                  <li key={g.id} className="rounded-lg border border-line bg-base-900/60 px-3 py-2">
                    <Link to="/goals" className="text-sm text-gold-300 hover:underline">
                      {g.title}
                    </Link>
                    {g.description && (
                      <p className="mt-0.5 text-xs text-ink-400">{g.description}</p>
                    )}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="px-4 py-4 text-xs text-ink-600">
                {match.primaryMistake
                  ? `当前没有针对「${mistakeLabel(match.primaryMistake)}」的训练目标。`
                  : "还没有训练目标，可在「训练目标」页创建。"}
              </p>
            )}
          </Panel>

          <Panel>
            <PanelHeader title="这局的元数据" />
            <dl className="grid grid-cols-1 gap-3 p-4 sm:grid-cols-2">
              <Fact label="记录于" value={new Date(match.createdAt).toLocaleString("zh-CN")} />
              <Fact label="修改于" value={new Date(match.updatedAt).toLocaleString("zh-CN")} />
              <Fact label="决策记录" value={decisions.length} />
              <Fact label="对局 ID" value={match.id.slice(0, 8)} mono />
            </dl>
            <p className="flex items-center gap-1.5 border-t border-line px-4 py-2.5 text-[11px] text-ink-600">
              <CalendarClock size={12} />
              数据保存在本机浏览器 IndexedDB
            </p>
          </Panel>
        </div>
      </div>

      <Modal
        open={confirm}
        onClose={() => setConfirm(false)}
        title="删除这局对局？"
        subtitle="决策记录和复盘会一起删除，不可撤销"
        footer={
          <>
            <Button
              variant="danger"
              onClick={async () => {
                await deleteMatch(match.id);
                toast.push("对局已删除");
                navigate("/matches");
              }}
            >
              确认删除
            </Button>
            <Button onClick={() => setConfirm(false)}>取消</Button>
          </>
        }
      >
        <p className="text-sm text-ink-200">
          第 {match.placement} 名 · {match.playedAt.slice(0, 10)} ·{" "}
          {match.composition ?? "未填阵容"}
        </p>
      </Modal>
    </>
  );
}

function Fact({
  label,
  value,
  mono,
}: {
  label: string;
  value: string | number | undefined;
  mono?: boolean;
}) {
  return (
    <div className="min-w-0">
      <dt className="text-[11px] uppercase tracking-wide text-ink-600">{label}</dt>
      <dd className={`truncate text-sm text-ink-50 ${mono ? "num text-xs" : ""}`}>{value ?? "—"}</dd>
    </div>
  );
}

function TextRow({ label, value }: { label: string; value?: string }) {
  return (
    <div>
      <div className="text-[11px] uppercase tracking-wide text-ink-600">{label}</div>
      <p className="mt-0.5 whitespace-pre-wrap text-sm text-ink-100">
        {value || <span className="text-ink-600">未填写</span>}
      </p>
    </div>
  );
}

function ChipRow({ label, values }: { label: string; values?: string[] }) {
  return (
    <div>
      <div className="text-[11px] uppercase tracking-wide text-ink-600">{label}</div>
      {values && values.length > 0 ? (
        <div className="mt-1 flex flex-wrap gap-1.5">
          {values.map((v) => (
            <span
              key={v}
              className="rounded-md border border-line bg-base-900/70 px-2 py-0.5 text-xs text-ink-200"
            >
              {v}
            </span>
          ))}
        </div>
      ) : (
        <p className="mt-0.5 text-sm text-ink-600">未填写</p>
      )}
    </div>
  );
}
