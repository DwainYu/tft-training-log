/**
 * One empty state for every chart.
 *
 * "Empty" has three different meanings and mixing them up lies to the user:
 * `undefined` (still loading) must never render "no data", and "2 games"
 * must never render the same message as "0 games" — 2 games is not nothing,
 * it is just not enough to compare anything.
 */
export function ChartEmpty({
  loading = false,
  count,
  min,
  what,
  how,
}: {
  /** The query is still in flight: render a placeholder, never "no data". */
  loading?: boolean;
  /** How many records feed this chart right now. */
  count: number;
  /** `MIN_SAMPLES` entry for this chart. */
  min: number;
  /** What shows up once `min` is reached, e.g. "最近的名次走势". */
  what: string;
  /** The action that produces a record, shown in the 0-record case. */
  how?: string;
}) {
  if (loading) {
    return <p className="px-1 py-8 text-center text-xs text-ink-600">计算中…</p>;
  }

  if (count === 0) {
    return (
      <div className="px-1 py-8 text-center">
        <p className="text-xs text-ink-400">记录第一局后，这里会开始显示{what}。</p>
        {how && <p className="mt-1 text-xs text-ink-600">{how}</p>}
      </div>
    );
  }

  return (
    <div className="px-1 py-8 text-center">
      <p className="text-xs text-ink-400">已记录 {count} 局，记到 {min} 局后这里才会显示{what}。</p>
      {how && <p className="mt-1 text-xs text-ink-600">{how}</p>}
    </div>
  );
}
