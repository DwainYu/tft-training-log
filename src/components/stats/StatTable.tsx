import type { ReactNode } from "react";
import { Link } from "react-router-dom";

export interface StatTableColumn<T> {
  key: string;
  label: string;
  align?: "left" | "right";
  render: (row: T) => ReactNode;
}

/**
 * Generic data table used by the composition and time-slot sections.
 *
 * `rowHref` turns each row into a drill-down: the statistics are only useful
 * if you can get to the games behind them.
 */
export function StatTable<T>({
  columns,
  rows,
  empty = "暂无数据",
  rowHref,
  rowHrefLabel = "查看这几局",
}: {
  columns: StatTableColumn<T>[];
  rows: T[];
  empty?: string;
  /** When given, every row gets a link to this `/matches` query. */
  rowHref?: (row: T) => string;
  rowHrefLabel?: string;
}) {
  if (rows.length === 0) return <p className="px-1 py-10 text-center text-xs text-ink-600">{empty}</p>;
  return (
    <div className="w-full overflow-x-auto">
      <table className="w-full text-left text-sm">
        <thead>
          <tr className="border-b border-line text-[11px] uppercase tracking-wide text-ink-600">
            {columns.map((c) => (
              <th key={c.key} className={`whitespace-nowrap px-3 py-2 font-medium ${c.align === "right" ? "text-right" : ""}`}>
                {c.label}
              </th>
            ))}
            {rowHref && <th className="px-3 py-2" aria-label="操作" />}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i} className="border-b border-line/60 last:border-0">
              {columns.map((c) => (
                <td key={c.key} className={`whitespace-nowrap px-3 py-2.5 ${c.align === "right" ? "num text-right" : ""}`}>
                  {c.render(row)}
                </td>
              ))}
              {rowHref && (
                <td className="whitespace-nowrap px-3 py-2.5 text-right">
                  <Link
                    to={`/matches?${rowHref(row)}`}
                    className="text-xs text-gold-300 underline-offset-4 hover:underline"
                  >
                    {rowHrefLabel}
                  </Link>
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
