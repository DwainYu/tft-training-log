import { Link } from "react-router-dom";
import { CheckCircle2, Circle } from "lucide-react";
import { mistakeLabel } from "../../domain/labels";
import { placementTone } from "../../domain/match/match";
import type { Match } from "../../domain/types";
import { formatDuration } from "../../lib/utils";
import { DESKTOP_QUERY, useMediaQuery } from "../../lib/use-media-query";
import { formatDateWeekday, formatTime } from "../../lib/wallclock";
import { Badge } from "../ui/Badge";

const TONE: Record<string, "gold" | "good" | "bad"> = {
  gold: "gold",
  good: "good",
  bad: "bad",
};

const linkClass = "text-xs text-gold-300 underline-offset-4 hover:underline";

/** One row per match — table on desktop, card list below the md breakpoint. */
export function MatchList({ matches }: { matches: Match[] }) {
  const desktop = useMediaQuery(DESKTOP_QUERY);
  if (!desktop) return <MatchCards matches={matches} />;

  return (
    <table className="w-full text-left text-sm">
      <thead className="border-b border-line text-[11px] uppercase tracking-wide text-ink-600">
        <tr>
          <th className="px-3 py-2 font-medium">Date</th>
          <th className="px-3 py-2 font-medium">Placement</th>
          <th className="px-3 py-2 font-medium">Comp</th>
          <th className="px-3 py-2 font-medium">Level</th>
          <th className="px-3 py-2 font-medium">Duration</th>
          <th className="px-3 py-2 font-medium">Reviewed</th>
          <th className="px-3 py-2 font-medium">Primary Mistake</th>
          <th className="px-3 py-2" aria-label="操作" />
        </tr>
      </thead>
      <tbody>
        {matches.map((m) => (
          <tr key={m.id} className="border-b border-line/60 last:border-0 hover:bg-base-800/60">
            <td className="px-3 py-2.5">
              <div className="num text-ink-50">{m.playedAt.slice(5, 10)}</div>
              <div className="num text-[11px] text-ink-600">
                {formatDateWeekday(m.playedAt)} {formatTime(m.playedAt) || "—"}
              </div>
            </td>
            <td className="px-3 py-2.5">
              <Badge tone={TONE[placementTone(m.placement)]}>第 {m.placement} 名</Badge>
            </td>
            <td className="max-w-[22ch] truncate px-3 py-2.5 text-ink-200">
              {m.composition ?? <span className="text-ink-600">未填</span>}
            </td>
            <td className="num px-3 py-2.5 text-ink-200">{m.finalLevel ?? "—"}</td>
            <td className="num px-3 py-2.5 text-ink-400">
              {m.durationSeconds !== undefined ? formatDuration(m.durationSeconds) : "—"}
            </td>
            <td className="px-3 py-2.5">
              <ReviewedFlag reviewed={m.reviewed} />
            </td>
            <td className="px-3 py-2.5">
              {m.primaryMistake ? (
                <Badge tone="neutral">{mistakeLabel(m.primaryMistake)}</Badge>
              ) : (
                <span className="text-xs text-ink-600">—</span>
              )}
            </td>
            <td className="px-3 py-2.5 text-right">
              <Link to={`/matches/${m.id}`} className={linkClass}>
                详情
              </Link>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function ReviewedFlag({ reviewed }: { reviewed: boolean }) {
  return reviewed ? (
    <span className="inline-flex items-center gap-1 text-xs text-emerald-300">
      <CheckCircle2 size={13} /> 已复盘
    </span>
  ) : (
    <span className="inline-flex items-center gap-1 text-xs text-ink-600">
      <Circle size={13} /> 未复盘
    </span>
  );
}

function MatchCards({ matches }: { matches: Match[] }) {
  return (
    <ul className="divide-y divide-line">
      {matches.map((m) => (
        <li key={m.id}>
          <Link to={`/matches/${m.id}`} className="block px-4 py-3 hover:bg-base-800/60">
            <div className="flex items-center gap-2">
              <Badge tone={TONE[placementTone(m.placement)]}>第 {m.placement} 名</Badge>
              <span className="num text-xs text-ink-400">
                {m.playedAt.slice(5, 10)} {formatTime(m.playedAt)}
              </span>
              <span className="ml-auto text-[11px] text-ink-600">
                {m.reviewed ? "已复盘" : "未复盘"}
              </span>
            </div>
            <div className="mt-1.5 truncate text-sm text-ink-50">
              {m.composition ?? "未填阵容"}
              {m.finalLevel !== undefined ? (
                <span className="num text-xs text-ink-600"> · Lv{m.finalLevel}</span>
              ) : null}
            </div>
            {m.primaryMistake && (
              <div className="mt-1">
                <Badge tone="neutral">{mistakeLabel(m.primaryMistake)}</Badge>
              </div>
            )}
          </Link>
        </li>
      ))}
    </ul>
  );
}
