import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "./Button";

export function Pagination({
  page,
  pageSize,
  total,
  onPage,
}: {
  page: number;
  pageSize: number;
  total: number;
  onPage: (page: number) => void;
}) {
  const pages = Math.max(1, Math.ceil(total / pageSize));
  const from = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const to = Math.min(total, page * pageSize);

  return (
    <div className="flex flex-wrap items-center gap-3 border-t border-line px-4 py-3 text-xs text-ink-400">
      <span className="num">
        {from}–{to} / {total}
      </span>
      <div className="ml-auto flex items-center gap-2">
        <Button size="sm" disabled={page <= 1} onClick={() => onPage(page - 1)}>
          <ChevronLeft size={13} />
          上一页
        </Button>
        <span className="num min-w-16 text-center">
          {page} / {pages}
        </span>
        <Button size="sm" disabled={page >= pages} onClick={() => onPage(page + 1)}>
          下一页
          <ChevronRight size={13} />
        </Button>
      </div>
    </div>
  );
}
