import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useLiveQuery } from "dexie-react-hooks";
import { ChevronLeft, ListChecks } from "lucide-react";
import { deleteReview, saveReview } from "../services/review-service";
import { getMatchBundle } from "../services/match-service";
import type { ReviewInput } from "../domain/review/review";
import { mistakeLabel } from "../domain/labels";
import { durationOf } from "../domain/match/match";
import { errorMessage, ValidationError } from "../lib/errors";
import { formatDuration } from "../lib/utils";
import { formatDateWeekday, formatTime } from "../lib/wallclock";
import { ReviewForm } from "../components/reviews/ReviewForm";
import { Badge } from "../components/ui/Badge";
import { Button, LinkButton } from "../components/ui/Button";
import { Modal } from "../components/ui/Modal";
import { PageHeader, Panel } from "../components/ui/Panel";
import { Spinner } from "../components/ui/Spinner";
import { useToast } from "../components/ui/Toast";

export function ReviewPage() {
  const { id = "" } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const toast = useToast();
  const [errors, setErrors] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const bundle = useLiveQuery(() => getMatchBundle(id), [id]);

  if (bundle === undefined) return <Spinner label="读取复盘" />;
  if (bundle === null) {
    return (
      <>
        <PageHeader title="赛后复盘" />
        <Panel className="p-6">
          <p className="text-sm text-ink-400">找不到这局对局。</p>
          <LinkButton to="/matches" className="mt-3">
            返回对局列表
          </LinkButton>
        </Panel>
      </>
    );
  }

  const { match, review, decisions } = bundle;
  const duration = durationOf(match);

  async function onSubmit(input: ReviewInput) {
    setBusy(true);
    setErrors([]);
    try {
      await saveReview(match.id, input);
      toast.push("复盘已保存 · 这局标记为已复盘");
      navigate(`/matches/${match.id}`);
    } catch (err) {
      setErrors(err instanceof ValidationError ? err.errors : [errorMessage(err)]);
      setBusy(false);
    }
  }

  return (
    <>
      <div className="mb-4">
        <Link
          to={`/matches/${match.id}`}
          className="inline-flex items-center gap-1 text-xs text-ink-600 hover:text-ink-200"
        >
          <ChevronLeft size={13} />
          对局详情
        </Link>
      </div>

      <PageHeader
        title="赛后复盘"
        subtitle={`${match.playedAt.slice(0, 10)} ${formatDateWeekday(match.playedAt)} ${formatTime(match.playedAt)}`}
        action={
          <>
            <Badge tone={match.reviewed ? "good" : "muted"}>
              {match.reviewed ? "已复盘" : review ? "复盘中" : "未复盘"}
            </Badge>
            {match.primaryMistake && (
              <Badge tone="bad">{mistakeLabel(match.primaryMistake)}</Badge>
            )}
          </>
        }
      />

      <div className="grid gap-4 lg:grid-cols-[1fr_300px]">
        <ReviewForm
          initial={review}
          errors={errors}
          busy={busy}
          onSave={onSubmit}
          onDelete={review ? () => setConfirmDelete(true) : undefined}
          onDiscard={() => navigate(`/matches/${match.id}`)}
        />

        <aside className="flex flex-col gap-4">
          <Panel className="p-4">
            <div className="flex items-center gap-2">
              <Badge tone={match.placement === 1 ? "gold" : match.placement <= 4 ? "good" : "bad"}>
                第 {match.placement} 名
              </Badge>
              <span className="num text-xs text-ink-400">
                {duration !== undefined ? formatDuration(duration) : "时长未填"}
              </span>
            </div>
            <dl className="mt-3 flex flex-col gap-2 text-sm">
              <SideFact label="阵容" value={match.composition} />
              <SideFact label="等级" value={match.finalLevel?.toString()} />
              <SideFact label="血量" value={match.finalHealth?.toString()} />
              <SideFact label="核心棋子" value={match.coreUnits?.join(" / ")} />
              <SideFact label="核心装备" value={match.coreItems?.join(" / ")} />
              <SideFact label="强化符文" value={match.augments?.join(" / ")} />
            </dl>
          </Panel>

          <Panel className="p-4">
            <div className="flex items-center gap-2 text-sm text-ink-50">
              <ListChecks size={15} className="text-gold-300" />
              关键决策
              <Badge tone="muted" className="ml-auto">
                {decisions.length} 条
              </Badge>
            </div>
            <p className="mt-2 text-xs leading-relaxed text-ink-600">
              决策记录写在复盘旁边：回合、当时的状态、你的决定和原因。它比这段文字更能说明问题出在哪。
            </p>
            <LinkButton to={`/matches/${match.id}`} size="sm" className="mt-3">
              去对局详情添加决策
            </LinkButton>
          </Panel>
        </aside>
      </div>

      <Modal
        open={confirmDelete}
        onClose={() => setConfirmDelete(false)}
        title="删除这局的复盘？"
        subtitle="这局会回到「未复盘」状态"
        footer={
          <>
            <Button
              variant="danger"
              onClick={async () => {
                await deleteReview(match.id);
                toast.push("复盘已删除");
                setConfirmDelete(false);
                navigate(`/matches/${match.id}`);
              }}
            >
              确认删除
            </Button>
            <Button onClick={() => setConfirmDelete(false)}>取消</Button>
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

function SideFact({ label, value }: { label: string; value?: string }) {
  return (
    <div className="flex items-baseline gap-2">
      <dt className="w-16 shrink-0 text-[11px] uppercase tracking-wide text-ink-600">{label}</dt>
      <dd className="min-w-0 flex-1 truncate text-ink-100">
        {value || <span className="text-ink-600">未填</span>}
      </dd>
    </div>
  );
}
