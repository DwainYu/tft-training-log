import { StatTable, type StatTableColumn } from "./StatTable";
import { formatNumber } from "../../lib/utils";
import { formatRateValue } from "./StatCard";

export interface GroupRow {
  key: string;
  label: string;
  matches: number;
  avgPlacement: number | null;
  top4Rate: number | null;
}

/**
 * One table for every "group the matches by a value" statistic. The 场次
 * column is the sample size and leads the row; below `min` the derived cells
 * refuse to speak rather than presenting 1 game as a pattern.
 */
export function GroupStatTable({
  rows,
  labelHeader,
  min,
  empty,
  hrefFor,
  hrefLabel = "查看这几局",
}: {
  rows: GroupRow[];
  labelHeader: string;
  min: number;
  empty: string;
  hrefFor?: (key: string) => string;
  hrefLabel?: string;
}) {
  const columns: StatTableColumn<GroupRow>[] = [
    { key: "label", label: labelHeader, render: (r) => <span className="text-ink-50">{r.label}</span> },
    { key: "matches", label: "局数", align: "right", render: (r) => r.matches },
    {
      key: "avg",
      label: "平均名次",
      align: "right",
      render: (r) =>
        r.matches >= min ? (
          formatNumber(r.avgPlacement, 1)
        ) : (
          <span className="text-ink-600">样本不足</span>
        ),
    },
    {
      key: "top4",
      label: "Top4 率",
      align: "right",
      render: (r) =>
        r.matches >= min ? (
          formatRateValue(r.top4Rate)
        ) : (
          <span className="text-ink-600">样本不足</span>
        ),
    },
  ];
  return (
    <StatTable
      columns={columns}
      rows={rows}
      rowHref={hrefFor ? (row) => hrefFor(row.key) : undefined}
      rowHrefLabel={hrefLabel}
      empty={empty}
    />
  );
}
