import { useState } from "react";
import { Eraser, Save, Trash2 } from "lucide-react";
import {
  REVIEW_SECTIONS,
  isReviewComplete,
  reviewInputOf,
  reviewProgress,
  type ReviewInput,
} from "../../domain/review/review";
import { OPENING_PLAN_LIST, openingPlanLabel } from "../../domain/labels";
import type { OpeningPlan, Review } from "../../domain/types";
import { Badge } from "../ui/Badge";
import { Button } from "../ui/Button";
import { Field, Textarea } from "../ui/Field";
import { Panel, PanelHeader } from "../ui/Panel";
import { MistakePicker } from "../matches/MistakeSelect";

const BLOCKS: { key: keyof typeof REVIEW_SECTIONS; field: keyof ReviewInput; rows: number }[] = [
  { key: "opening", field: "opening", rows: 4 },
  { key: "midGame", field: "midGame", rows: 5 },
  { key: "lateGame", field: "lateGame", rows: 4 },
];

export function ReviewForm({
  initial,
  initialOpeningPlan,
  errors,
  onSave,
  onDelete,
  onDiscard,
  busy,
}: {
  initial?: Review;
  /** Structured fact that lives on the match; prefilled so editing is idempotent. */
  initialOpeningPlan?: OpeningPlan;
  /** Validation messages from the service layer. */
  errors?: string[];

  onSave: (input: ReviewInput, openingPlan: OpeningPlan | null) => void;
  onDelete?: () => void;
  onDiscard?: () => void;
  busy?: boolean;
}) {
  const [input, setInput] = useState<ReviewInput>(() => reviewInputOf(initial));
  const [openingPlan, setOpeningPlan] = useState<OpeningPlan | undefined>(initialOpeningPlan);

  const set = <K extends keyof ReviewInput>(key: K, value: ReviewInput[K]) =>
    setInput((prev) => ({ ...prev, [key]: value }));

  const complete = isReviewComplete(input);
  const progress = reviewProgress({ ...input, openingPlan });
  // Open the free-text block when it already holds something, so an existing
  // write-up is never hidden behind a collapsed section.
  const hasFreeText = BLOCKS.some(({ field }) => Boolean((input[field] as string | undefined)?.trim()));

  return (
    <form
      className="flex flex-col gap-4"
      onSubmit={(e) => {
        e.preventDefault();
        onSave(input, openingPlan ?? null);
      }}
    >
      <Panel>
        <PanelHeader
          title="开局路线"
          subtitle="点一下即可 · 会进入统计"
          action={
            <Badge tone={openingPlan ? "gold" : "muted"}>
              {openingPlan ? openingPlanLabel(openingPlan) : "未填"}
            </Badge>
          }
        />
        <div className="p-4">
          <Field
            label="这局是怎么开的"
            hint="选最接近的一个。它和「主要问题」是两件事：这里记录过程，结论那边记录归因。"
          >
            <div role="group" aria-label="开局路线" className="flex flex-wrap gap-1.5">
              {OPENING_PLAN_LIST.map((plan) => {
                const selected = openingPlan === plan;
                return (
                  <button
                    key={plan}
                    type="button"
                    aria-pressed={selected}
                    onClick={() => setOpeningPlan(selected ? undefined : plan)}
                    className={[
                      "rounded-md border px-2.5 py-1.5 text-xs transition-colors",
                      selected
                        ? "border-gold-500/50 bg-gold-500/15 text-gold-300"
                        : "border-line bg-base-900/60 text-ink-400 hover:bg-base-800 hover:text-ink-200",
                    ].join(" ")}
                  >
                    {openingPlanLabel(plan)}
                  </button>
                );
              })}
            </div>
          </Field>
        </div>
      </Panel>

      <details open={hasFreeText}>
        <summary className="panel cursor-pointer list-none px-4 py-3">
          <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
            <h2 className="text-sm font-semibold text-ink-50">过程补充 · 开局 / 中期 / 后期</h2>
            <span className="text-xs text-ink-600">自由文本，不进入任何统计</span>
            <span className="ml-auto text-[11px] text-ink-600">{hasFreeText ? "收起" : "展开"}</span>
          </div>
        </summary>
        <div className="mt-2 flex flex-col gap-4">
          {BLOCKS.map(({ key, field, rows }) => (
            <Panel key={key}>
              <PanelHeader
                title={REVIEW_SECTIONS[key].title}
                subtitle={REVIEW_SECTIONS[key].prompts.join(" · ")}
              />
              <div className="p-4">
                <Field htmlFor={`rv-${key}`} hint="按提示逐条写，一两句话就够">
                  <Textarea
                    id={`rv-${key}`}
                    rows={rows}
                    value={(input[field] as string | undefined) ?? ""}
                    placeholder={REVIEW_SECTIONS[key].prompts.map((p) => `· ${p}`).join("\n")}
                    onChange={(e) => set(field, e.target.value)}
                  />
                </Field>
              </div>
            </Panel>
          ))}
        </div>
      </details>

      <Panel>
        <PanelHeader
          title="复盘结论"
          subtitle="四项必填 —— 这是整个训练闭环的出口"
          action={
            <Badge tone={complete ? "good" : "muted"}>{complete ? "已满足必填" : "必填未完成"}</Badge>
          }
        />
        <div className="flex flex-col gap-4 p-4">
          {(errors?.length ?? 0) > 0 && (
            <ul className="rounded-lg border border-bad/35 bg-bad/10 px-3 py-2 text-xs text-bad">
              {errors?.map((e) => (
                <li key={e}>{e}</li>
              ))}
            </ul>
          )}

          <Field label="Primary Mistake" required hint="统计只读这一个分类，选最影响结果的那个">
            <MistakePicker
              value={(input.primaryMistake ?? "") as never}
              onChange={(v) => set("primaryMistake", v || undefined)}
            />
          </Field>

          <div className="grid gap-3 lg:grid-cols-2">
            <Field label="本局最大问题" htmlFor="rv-biggest" required>
              <Textarea
                id="rv-biggest"
                rows={3}
                value={input.biggestMistake ?? ""}
                placeholder="例如：4-1 锁血时 D 牌过深，把经济全部打空"
                onChange={(e) => set("biggestMistake", e.target.value)}
              />
            </Field>
            <Field label="本局做得最好的一件事" htmlFor="rv-best" required>
              <Textarea
                id="rv-best"
                rows={3}
                value={input.bestDecision ?? ""}
                placeholder="例如：3-2 直接上 6，稳住了连胜"
                onChange={(e) => set("bestDecision", e.target.value)}
              />
            </Field>
          </div>

          <Field label="下一局要刻意练习什么" htmlFor="rv-focus" required>
            <Textarea
              id="rv-focus"
              rows={2}
              value={input.nextGameFocus ?? ""}
              placeholder="写成一条可执行的动作，而不是「注意经济」"
              onChange={(e) => set("nextGameFocus", e.target.value)}
            />
          </Field>

          <Field label="自我评分" htmlFor="rv-score" hint="1 = 完全失控，5 = 决策基本没有遗憾">
            <div className="flex items-center gap-2">
              {[1, 2, 3, 4, 5].map((n) => (
                <button
                  key={n}
                  type="button"
                  id={n === 1 ? "rv-score" : undefined}
                  aria-pressed={input.selfScore === n}
                  onClick={() => set("selfScore", input.selfScore === n ? undefined : n)}
                  className={[
                    "num size-9 rounded-lg border text-sm transition-colors",
                    input.selfScore === n
                      ? "border-gold-500/50 bg-gold-500/15 text-gold-300"
                      : "border-line bg-base-900/70 text-ink-400 hover:bg-base-800",
                  ].join(" ")}
                >
                  {n}
                </button>
              ))}
              {input.selfScore && (
                <button
                  type="button"
                  onClick={() => set("selfScore", undefined)}
                  className="ml-1 inline-flex items-center gap-1 text-[11px] text-ink-600 hover:text-ink-200"
                >
                  <Eraser size={12} /> 清除
                </button>
              )}
            </div>
          </Field>
        </div>
      </Panel>

      <div className="flex flex-wrap items-center gap-2">
        <Button type="submit" variant="primary" disabled={busy}>
          <Save size={15} />
          保存复盘
        </Button>
        {onDiscard && (
          <Button type="button" variant="ghost" onClick={onDiscard}>
            取消
          </Button>
        )}
        {onDelete && (
          <Button type="button" variant="danger" onClick={onDelete} className="ml-auto">
            <Trash2 size={14} />
            删除复盘
          </Button>
        )}

        <div className="flex w-full flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-ink-600 sm:w-auto sm:flex-1 sm:justify-end">
          <span className="num text-ink-400">复盘完整度 {progress.percent}%</span>
          <span
            className="h-1 w-24 overflow-hidden rounded bg-base-800"
            role="progressbar"
            aria-valuenow={progress.percent}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label="复盘完整度"
          >
            <span
              className="block h-1 rounded bg-gold-400"
              style={{ width: `${progress.percent}%` }}
            />
          </span>
          {progress.missing.length > 0 && <span>缺：{progress.missing.join(" / ")}</span>}
        </div>
      </div>
    </form>
  );
}
