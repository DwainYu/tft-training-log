import { Check, Circle, X } from "lucide-react";
import { decisionLabel, hindsightLabel, mistakeLabel } from "../../domain/labels";
import type { TimelineEvent } from "../../domain/decision/timeline";
import { Badge } from "../ui/Badge";

const HINDSIGHT_MARK: Record<
  "correct" | "wrong" | "mixed",
  { icon: typeof Check; cls: string }
> = {
  correct: { icon: Check, cls: "text-good border-good/40 bg-good/10" },
  wrong: { icon: X, cls: "text-bad border-bad/40 bg-bad/10" },
  mixed: { icon: Circle, cls: "text-ink-400 border-line bg-base-900" },
};

/**
 * "这一局是怎么一步步走到这个结果的" — decisions in round order, then the
 * final result. The round is shown exactly as typed: an unparseable value
 * keeps its text and simply sorts last, so nothing the player wrote is
 * reinterpreted. Purely presentational: the view model is built in
 * `domain/decision/timeline.ts`.
 */
export function DecisionTimeline({ events }: { events: TimelineEvent[] }) {
  const decisions = events.filter((e): e is Extract<TimelineEvent, { kind: "decision" }> => e.kind === "decision");
  const outcome = events.find((e): e is Extract<TimelineEvent, { kind: "outcome" }> => e.kind === "outcome");

  return (
    <ol className="flex flex-col">
      {decisions.length === 0 && (
        <li className="px-4 pt-4 text-xs text-ink-600">这局还没有记录决策。</li>
      )}
      {decisions.map((e) => {
        const mark = e.hindsight ? HINDSIGHT_MARK[e.hindsight] : undefined;
        const Icon = mark?.icon;
        return (
          <li key={e.id} className="relative flex gap-3 px-4 py-2.5">
            <span
              className="num mt-0.5 w-12 shrink-0 rounded-md border border-line bg-base-900/70 px-1 py-0.5 text-center text-[11px] text-ink-200"
              title={e.round}
            >
              {e.round || "—"}
            </span>
            <span className="min-w-0 flex-1">
              <span className="flex flex-wrap items-center gap-1.5">
                <span className="text-xs font-medium text-gold-300">{decisionLabel(e.type as never)}</span>
                {mark && Icon && (
                  <span
                    className={`inline-flex items-center gap-0.5 rounded border px-1 py-px text-[10px] ${mark.cls}`}
                  >
                    <Icon size={10} aria-hidden />
                    {hindsightLabel(e.hindsight)}
                  </span>
                )}
              </span>
              <span className="mt-0.5 block break-words text-sm leading-relaxed text-ink-200">
                {e.title}
              </span>
            </span>
          </li>
        );
      })}

      {outcome && (
        <li className="mt-1 flex flex-wrap items-center gap-2 border-t border-line bg-base-900/40 px-4 py-3">
          <span className="text-[11px] uppercase tracking-wide text-ink-600">最终结果</span>
          <Badge tone={outcome.placement === 1 ? "gold" : outcome.placement <= 4 ? "good" : "bad"}>
            第 {outcome.placement} 名
          </Badge>
          {outcome.finalHealth !== undefined && (
            <span className="num text-xs text-ink-400">最终血量 {outcome.finalHealth}</span>
          )}
          {outcome.primaryMistake && (
            <Badge tone="bad">{mistakeLabel(outcome.primaryMistake)}</Badge>
          )}
        </li>
      )}
    </ol>
  );
}
