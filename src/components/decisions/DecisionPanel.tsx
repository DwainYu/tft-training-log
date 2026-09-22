import { useState } from "react";
import { Pencil, Plus, Save, Trash2 } from "lucide-react";
import { DECISION_TYPE_LIST, HINDSIGHT_LABELS, DECISION_LABELS, decisionLabel } from "../../domain/labels";
import { DECISION_HINDSIGHTS, type Decision, type DecisionHindsight, type DecisionType } from "../../domain/types";
import type { DecisionInput } from "../../domain/decision/decision";
import { Button } from "../ui/Button";
import { Field, Input, Textarea } from "../ui/Field";
import { Panel } from "../ui/Panel";
import { Badge } from "../ui/Badge";

const ROUND_SUGGESTIONS = ["1-5", "2-1", "2-2", "2-5", "3-1", "3-2", "3-5", "4-1", "4-2", "4-5", "5-1", "5-5", "决赛圈"];

export function DecisionForm({
  initial,
  onCancel,
  onSave,
  busy,
}: {
  initial?: Decision;
  onCancel: () => void;
  /** Called with the draft; resolve to keep the form open, return false to close it. */
  onSave: (input: DecisionInput) => Promise<boolean | void> | boolean | void;
  busy?: boolean;
}) {
  const [draft, setDraft] = useState<DecisionInput>(() =>
    initial
      ? {
          round: initial.round,
          type: initial.type,
          situation: initial.situation ?? "",
          decision: initial.decision,
          reasoning: initial.reasoning ?? "",
          result: initial.result ?? "",
          hindsight: initial.hindsight,
          hindsightNote: initial.hindsightNote ?? "",
        }
      : { round: "", type: "OTHER", situation: "", decision: "", reasoning: "" },
  );

  const set = <K extends keyof DecisionInput>(key: K, value: DecisionInput[K]) =>
    setDraft((d) => ({ ...d, [key]: value }));

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const keep = await onSave(draft);
    // stay open after a quick add: keep the round, clear the volatile answers
    if (keep !== false && !initial) {
      setDraft((d) => ({
        ...d,
        situation: "",
        decision: "",
        reasoning: "",
        result: "",
        hindsight: undefined,
        hindsightNote: undefined,
      }));
    }
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-3 p-4">
      <div className="grid gap-3 sm:grid-cols-[110px_1fr]">
        <Field label="回合" htmlFor="dc-round" required>
          <Input
            id="dc-round"
            list="dc-rounds"
            value={draft.round}
            placeholder="3-2"
            onChange={(e) => set("round", e.target.value)}
          />
          <datalist id="dc-rounds">
            {ROUND_SUGGESTIONS.map((r) => (
              <option key={r} value={r} />
            ))}
          </datalist>
        </Field>
        <Field label="当时状态" htmlFor="dc-situation">
          <Input
            id="dc-situation"
            value={draft.situation}
            placeholder="42 金币，72 血，连败"
            onChange={(e) => set("situation", e.target.value)}
          />
        </Field>
      </div>

      <div>
        <div className="mb-1.5 text-xs font-medium text-ink-400">类型</div>
        <div className="flex flex-wrap gap-1.5">
          {DECISION_TYPE_LIST.map((t: DecisionType) => (
            <button
              key={t}
              type="button"
              aria-pressed={draft.type === t}
              onClick={() => set("type", t)}
              className={[
                "rounded-md border px-2 py-1 text-xs transition-colors",
                draft.type === t
                  ? "border-gold-500/50 bg-gold-500/15 text-gold-300"
                  : "border-line bg-base-900/60 text-ink-400 hover:bg-base-800",
              ].join(" ")}
            >
              {DECISION_LABELS[t]}
            </button>
          ))}
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="我的决定" htmlFor="dc-decision" required>
          <Textarea
            id="dc-decision"
            rows={2}
            value={draft.decision}
            placeholder="直接上 6"
            onChange={(e) => set("decision", e.target.value)}
          />
        </Field>
        <Field label="为什么这么决定" htmlFor="dc-reason">
          <Textarea
            id="dc-reason"
            rows={2}
            value={draft.reasoning}
            placeholder="希望保持战斗力"
            onChange={(e) => set("reasoning", e.target.value)}
          />
        </Field>
        <Field label="结果" htmlFor="dc-result">
          <Textarea
            id="dc-result"
            rows={2}
            value={draft.result ?? ""}
            placeholder="连续赢了两轮"
            onChange={(e) => set("result", e.target.value)}
          />
        </Field>
        <div>
          <div className="mb-1.5 text-xs font-medium text-ink-400">现在回看</div>
          <div className="flex flex-wrap items-center gap-1.5">
            {DECISION_HINDSIGHTS.map((h: DecisionHindsight) => (
              <button
                key={h}
                type="button"
                aria-pressed={draft.hindsight === h}
                onClick={() => set("hindsight", draft.hindsight === h ? undefined : h)}
                className={[
                  "rounded-md border px-2 py-1 text-xs transition-colors",
                  draft.hindsight === h
                    ? h === "correct"
                      ? "border-emerald-500/50 bg-emerald-500/15 text-emerald-300"
                      : h === "wrong"
                        ? "border-red-500/50 bg-red-500/15 text-red-300"
                        : "border-amber-500/50 bg-amber-500/15 text-amber-300"
                    : "border-line bg-base-900/60 text-ink-400 hover:bg-base-800",
                ].join(" ")}
              >
                {HINDSIGHT_LABELS[h]}
              </button>
            ))}
          </div>
          <div className="mt-2">
            <Input
              value={draft.hindsightNote ?? ""}
              placeholder="一句话补充（可选）"
              onChange={(e) => set("hindsightNote", e.target.value)}
            />
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <Button type="submit" variant="primary" size="sm" disabled={busy}>
          <Save size={13} />
          {initial ? "保存修改" : "添加这条决策"}
        </Button>
        {!initial && (
          <span className="text-[11px] text-ink-600">添加后可以继续记下一条，回合不用改</span>
        )}
        <Button type="button" variant="ghost" size="sm" onClick={onCancel} className="ml-auto">
          取消
        </Button>
      </div>
    </form>
  );
}

export function DecisionCard({
  decision,
  onEdit,
  onDelete,
  busy,
}: {
  decision: Decision;
  onEdit: () => void;
  onDelete: () => void;
  busy?: boolean;
}) {
  return (
    <div className="flex flex-col gap-2 border-b border-line/60 px-4 py-3 last:border-0">
      <div className="flex flex-wrap items-center gap-2">
        <span className="num rounded bg-base-800 px-1.5 py-0.5 text-xs text-ink-200">
          {decision.round || "—"}
        </span>
        <Badge tone="neutral">{decisionLabel(decision.type)}</Badge>
        {decision.situation && (
          <span className="truncate text-xs text-ink-600">{decision.situation}</span>
        )}
        <span className="ml-auto flex items-center gap-1">
          <Button size="sm" variant="ghost" onClick={onEdit} disabled={busy} title="编辑">
            <Pencil size={12} />
          </Button>
          <Button size="sm" variant="ghost" onClick={onDelete} disabled={busy} title="删除">
            <Trash2 size={12} />
          </Button>
        </span>
      </div>
      <p className="text-sm text-ink-50">{decision.decision}</p>
      <div className="grid gap-1 text-xs sm:grid-cols-2">
        {decision.reasoning && (
          <p className="text-ink-400">
            <span className="text-ink-600">为什么：</span>
            {decision.reasoning}
          </p>
        )}
        {decision.result && (
          <p className="text-ink-400">
            <span className="text-ink-600">结果：</span>
            {decision.result}
          </p>
        )}
      </div>
      {decision.hindsight && (
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <Badge
            tone={
              decision.hindsight === "correct" ? "good" : decision.hindsight === "wrong" ? "bad" : "neutral"
            }
          >
            回看：{HINDSIGHT_LABELS[decision.hindsight]}
          </Badge>
          {decision.hindsightNote && <span className="text-ink-400">{decision.hindsightNote}</span>}
        </div>
      )}
    </div>
  );
}

export function DecisionPanel({
  decisions,
  onAdd,
  onUpdate,
  onRemove,
}: {
  decisions: Decision[];
  onAdd: (input: DecisionInput) => Promise<unknown> | unknown;
  onUpdate: (id: string, input: DecisionInput) => Promise<unknown> | unknown;
  onRemove: (id: string) => Promise<unknown> | unknown;
}) {
  const [adding, setAdding] = useState(false);
  const [editing, setEditing] = useState<Decision | null>(null);

  return (
    <Panel>
      {editing ? (
        <DecisionForm
          initial={editing}
          onCancel={() => setEditing(null)}
          onSave={async (input) => {
            await onUpdate(editing.id, input);
            setEditing(null);
            return false;
          }}
        />
      ) : adding ? (
        <DecisionForm
          onCancel={() => setAdding(false)}
          onSave={async (input) => {
            await onAdd(input);
            return true;
          }}
        />
      ) : null}

      <div className="flex items-center justify-between border-b border-line px-4 py-3">
        <div>
          <span className="text-sm font-semibold text-ink-50">关键决策</span>
          <span className="ml-2 text-xs text-ink-600">
            {decisions.length === 0 ? "还没有记录" : `${decisions.length} 条`}
          </span>
        </div>
        {!adding && !editing && (
          <Button size="sm" onClick={() => setAdding(true)}>
            <Plus size={13} />
            添加决策
          </Button>
        )}
      </div>

      {decisions.length === 0 ? (
        <p className="px-4 py-6 text-xs leading-relaxed text-ink-600">
          一局记下 2 – 3 个关键决策就够了：回合、当时的状态、你的决定、为什么。
          它比「我觉得打得不好」有用得多，也是统计错误类型的数据来源。
        </p>
      ) : (
        <div>
          {decisions.map((d) => (
            <DecisionCard
              key={d.id}
              decision={d}
              onEdit={() => setEditing(d)}
              onDelete={() => onRemove(d.id)}
            />
          ))}
        </div>
      )}
    </Panel>
  );
}
