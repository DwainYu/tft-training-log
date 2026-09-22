import type { ReactNode } from "react";

export interface StatTableColumn<T> {
  key: string;
  label: string;
  align?: "left" | "right";
  render: (row: T) => ReactNode;
}

/** Generic data table used by the composition and time-slot sections. */
export function StatTable<T>({
  columns,
  rows,
  empty = "暂无数据",
}: {
  columns: StatTableColumn<T>[];
  rows: T[];
  empty?: string;
}) {
  if (rows.length === 0) return <p className="px-1 py-10 text-center text-xs text-ink-600">{empty}</p>;
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[480px] text-left text-sm">
        <thead>
          <tr className="border-b border-line text-[11px] uppercase tracking-wide text-ink-600">
            {columns.map((c) => (
              <th key={c.key} className={`px-3 py-2 font-medium ${c.align === "right" ? "text-right" : ""}`}>
                {c.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i} className="border-b border-line/60 last:border-0">
              {columns.map((c) => (
                <td key={c.key} className={`px-3 py-2.5 ${c.align === "right" ? "num text-right" : ""}`}>
                  {c.render(row)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
