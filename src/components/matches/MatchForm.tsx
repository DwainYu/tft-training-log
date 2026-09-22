import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useLiveQuery } from "dexie-react-hooks";
import { AlertTriangle, ChevronLeft, Save, Trash2, Zap } from "lucide-react";
import { addMatch, knownCompositions, updateMatch } from "../../services/match-service";
import { mistakeLabel } from "../../domain/labels";
import { isTop4, isWin } from "../../domain/match/match";
import { MAX_PLACEMENT } from "../../domain/types";
import type { Match } from "../../domain/types";
import { errorMessage } from "../../lib/errors";
import { formatDuration } from "../../lib/utils";
import {
  TRAINING_WINDOW_LABEL,
  TRAINING_WINDOW_WARNING,
  isWithinTrainingWindow,
} from "../../lib/wallclock";
import { Button } from "../ui/Button";
import { Field, Input, Textarea } from "../ui/Field";
import { Panel, PanelHeader } from "../ui/Panel";
import { Badge } from "../ui/Badge";
import { useToast } from "../ui/Toast";
import { MistakeSelect } from "./MistakeSelect";
import { PlacementPicker } from "./PlacementPicker";
import {
  draftFromMatch,
  draftToPayload,
  effectiveDurationMinutes,
  emptyDraft,
  type MatchFormDraft,
} from "./match-form-model";

export function MatchForm({
  mode,
  match,
  onDelete,
}: {
  mode: "create" | "edit";
  match?: Match;
  onDelete?: () => void;
}) {
  const [draft, setDraft] = useState<MatchFormDraft>(() =>
    match ? draftFromMatch(match) : emptyDraft(),
  );
  const [errors, setErrors] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const toast = useToast();
  const navigate = useNavigate();
  const compositions = useLiveQuery(() => knownCompositions(), [], []);

  const set = <K extends keyof MatchFormDraft>(key: K, value: MatchFormDraft[K]) =>
    setDraft((d) => ({ ...d, [key]: value }));

  const payload = useMemo(() => draftToPayload(draft), [draft]);
  const outsideWindow = useMemo(
    () => !isWithinTrainingWindow(payload.playedAt),
    [payload.playedAt],
  );
  const durationMinutes = effectiveDurationMinutes(draft);

  async function submit() {
    setBusy(true);
    setErrors([]);
    try {
      if (mode === "create") {
        const created = await addMatch(payload);
        toast.push(`已记录第 ${created.placement} 名`);
        navigate(`/matches/${created.id}`);
      } else if (match) {
        await updateMatch(match.id, payload);
        toast.push("对局已更新");
        navigate(`/matches/${match.id}`);
      }
    } catch (err) {
      setErrors([errorMessage(err)]);
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      {errors.length > 0 && (
        <div className="panel border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-200">
          {errors.join("；")}
        </div>
      )}

      <Panel>
        <PanelHeader title="A · 基础信息" subtitle="时间不限制，只在校验区提示训练时段" />
        <div className="flex flex-col gap-4 p-4">
          <Field label="最终名次" required>
            <PlacementPicker
              value={draft.placement}
              onChange={(p) => set("placement", p === draft.placement ? undefined : p)}
            />
          </Field>

          <div className="grid gap-3 sm:grid-cols-3">
            <Field label="日期" htmlFor="f-date" required>
              <Input
                id="f-date"
                type="date"
                value={draft.date}
                onChange={(e) => set("date", e.target.value)}
              />
            </Field>
            <Field label="开始时间" htmlFor="f-start">
              <Input
                id="f-start"
                type="time"
                value={draft.startTime}
                onChange={(e) => set("startTime", e.target.value)}
              />
            </Field>
            <Field label="结束时间" htmlFor="f-end">
              <Input
                id="f-end"
                type="time"
                value={draft.endTime}
                onChange={(e) => set("endTime", e.target.value)}
              />
            </Field>
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            <Field
              label="游戏时长（分钟）"
              htmlFor="f-duration"
              hint={
                durationMinutes
                  ? `自动推算：${formatDuration(Number(durationMinutes) * 60)}`
                  : "填写开始/结束时间后自动推算，也可手动输入"
              }
            >
              <Input
                id="f-duration"
                type="number"
                min={0}
                max={120}
                inputMode="numeric"
                value={draft.durationMinutes}
                placeholder={durationMinutes || "28"}
                onChange={(e) => set("durationMinutes", e.target.value)}
              />
            </Field>
            <div className="sm:col-span-2">
              {outsideWindow && (
                <p className="mt-6 flex items-start gap-2 rounded-lg border border-amber-500/35 bg-amber-500/10 px-3 py-2 text-xs text-amber-200">
                  <AlertTriangle size={14} className="mt-0.5 shrink-0" />
                  <span>
                    {TRAINING_WINDOW_WARNING}（云顶之巅训练时段 {TRAINING_WINDOW_LABEL}）—— 仍然可以保存
                  </span>
                </p>
              )}
            </div>
          </div>
        </div>
      </Panel>

      <Panel>
        <PanelHeader title="B · 对局状态" />
        <div className="flex flex-col gap-4 p-4">
          <div className="grid gap-3 sm:grid-cols-3">
            <Field label="最终等级" htmlFor="f-level">
              <Input
                id="f-level"
                type="number"
                min={1}
                max={12}
                inputMode="numeric"
                value={draft.finalLevel}
                placeholder="7"
                onChange={(e) => set("finalLevel", e.target.value)}
              />
            </Field>
            <Field label="最终血量" htmlFor="f-health">
              <Input
                id="f-health"
                type="number"
                min={0}
                max={100}
                inputMode="numeric"
                value={draft.finalHealth}
                placeholder="35"
                onChange={(e) => set("finalHealth", e.target.value)}
              />
            </Field>
            <Field label="总金币（可选）" htmlFor="f-gold">
              <Input
                id="f-gold"
                type="number"
                min={0}
                inputMode="numeric"
                value={draft.totalGold}
                placeholder="42"
                onChange={(e) => set("totalGold", e.target.value)}
              />
            </Field>
          </div>

          <div className="flex flex-wrap items-center gap-3 text-xs text-ink-600">
            <span>结果状态（按名次自动判断）</span>
            <Badge tone={draft.placement && isWin({ placement: draft.placement }) ? "gold" : "muted"}>
              吃鸡
            </Badge>
            <Badge tone={draft.placement && isTop4({ placement: draft.placement }) ? "good" : "muted"}>
              Top4
            </Badge>
            <Badge tone={draft.placement && draft.placement > MAX_PLACEMENT / 2 ? "bad" : "muted"}>
              Bottom4
            </Badge>
          </div>
        </div>
      </Panel>

      <Panel>
        <PanelHeader
          title="C · 阵容 / 装备 / 强化"
          subtitle="MVP 阶段允许纯文本，例如 主C / 主坦 / 副C"
        />
        <div className="flex flex-col gap-4 p-4">
          <Field label="最终阵容名称" htmlFor="f-comp">
            <Input
              id="f-comp"
              list="f-comp-options"
              value={draft.composition}
              placeholder="例如：Fortune Reaver"
              onChange={(e) => set("composition", e.target.value)}
            />
            <datalist id="f-comp-options">
              {compositions.map((c) => (
                <option key={c} value={c} />
              ))}
            </datalist>
          </Field>

          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="主要羁绊" htmlFor="f-traits">
              <Input
                id="f-traits"
                value={draft.traits}
                placeholder="Fortune / Reaver / Vanguard"
                onChange={(e) => set("traits", e.target.value)}
              />
            </Field>
            <Field label="核心棋子" htmlFor="f-units">
              <Input
                id="f-units"
                value={draft.coreUnits}
                placeholder="Galio / Katarina / Tahm"
                onChange={(e) => set("coreUnits", e.target.value)}
              />
            </Field>
            <Field label="核心装备" htmlFor="f-items">
              <Textarea
                id="f-items"
                rows={3}
                value={draft.coreItems}
                placeholder={"主C：无尽 / 蓝 buff\n主坦：狂徒 / 反甲"}
                onChange={(e) => set("coreItems", e.target.value)}
              />
            </Field>
            <Field label="强化符文" htmlFor="f-augments">
              <Textarea
                id="f-augments"
                rows={3}
                value={draft.augments}
                placeholder="升级 / 经济类 / 战斗类"
                onChange={(e) => set("augments", e.target.value)}
              />
            </Field>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="最大问题（Primary Mistake）" htmlFor="f-mistake">
              <MistakeSelect
                id="f-mistake"
                value={(draft.primaryMistake || "") as never}
                onChange={(v) => set("primaryMistake", v)}
              />
              {draft.primaryMistake && (
                <p className="mt-1 text-[11px] text-ink-600">
                  复盘时会在这一项上继续展开：{mistakeLabel(draft.primaryMistake)}
                </p>
              )}
            </Field>
            <Field label="备注" htmlFor="f-notes">
              <Input
                id="f-notes"
                value={draft.notes}
                placeholder="一行话记住这局"
                onChange={(e) => set("notes", e.target.value)}
              />
            </Field>
          </div>
        </div>
      </Panel>

      <div className="flex flex-wrap items-center gap-2">
        <Button variant="primary" onClick={submit} disabled={busy || !draft.placement}>
          <Save size={15} />
          {mode === "create" ? "保存对局" : "保存修改"}
        </Button>
        <Button onClick={() => navigate(-1)}>
          <ChevronLeft size={15} />
          取消
        </Button>
        {mode === "edit" && onDelete && (
          <Button variant="danger" onClick={onDelete} className="ml-auto">
            <Trash2 size={15} />
            删除对局
          </Button>
        )}
        {!draft.placement && (
          <span className="flex items-center gap-1 text-[11px] text-ink-600">
            <Zap size={12} /> 想更快？侧边栏的「快速记录一局」只要 20 秒
          </span>
        )}
      </div>
    </div>
  );
}
