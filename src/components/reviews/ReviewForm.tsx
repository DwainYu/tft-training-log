import { useState } from "react";
import { Eraser, Save, Trash2 } from "lucide-react";
import { REVIEW_SECTIONS, isReviewComplete, reviewInputOf, type ReviewInput } from "../../domain/review/review";

import type { Review } from "../../domain/types";
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
  errors,
  onSave,
  onDelete,
  onDiscard,
  busy,
}: {
  initial?: Review;
  /** Validation messages from the service layer. */
  errors?: string[];

  onSave: (input: ReviewInput) => void;
  onDelete?: () => void;
  onDiscard?: () => void;
  busy?: boolean;
}) {
  const [input, setInput] = useState<ReviewInput>(() => reviewInputOf(initial));

  const set = <K extends keyof ReviewInput>(key: K, value: ReviewInput[K]) =>
    setInput((prev) => ({ ...prev, [key]: value }));

  const complete = isReviewComplete(input);

  return (
    <form
      className="flex flex-col gap-4"
      onSubmit={(e) => {
        e.preventDefault();
        onSave(input);
      }}
    >
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

      <Panel>
        <PanelHeader
          title="4 · 复盘结论"
          subtitle="四项必填 —— 这是整个训练闭环的出口"
          action={
            <Badge tone={complete ? "good" : "muted"}>{complete ? "已满足必填" : "必填未完成"}</Badge>
          }
        />
        <div className="flex flex-col gap-4 p-4">
          {(errors?.length ?? 0) > 0 && (
            <ul className="rounded-lg border border-red-500/35 bg-red-500/10 px-3 py-2 text-xs text-red-200">
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
      </div>
    </form>
  );
}
