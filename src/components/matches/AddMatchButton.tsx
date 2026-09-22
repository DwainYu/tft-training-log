import { Link } from "react-router-dom";
import { ChevronRight, Plus } from "lucide-react";
import { useQuickAdd } from "./QuickAddProvider";

/**
 * Two entry points, as the product needs them:
 * Quick Add for the 1-minute loop, the full form for the detailed record.
 */
export function AddMatchButton({ compact }: { compact?: boolean }) {
  const { openQuickAdd } = useQuickAdd();

  if (compact) {
    return (
      <button
        type="button"
        onClick={openQuickAdd}
        aria-label="快速记录一局"
        title="快速记录一局"
        className="grid size-9 place-items-center rounded-lg border border-gold-500/45 bg-gold-500/12 text-gold-300 hover:bg-gold-500/22"
      >
        <Plus size={16} strokeWidth={2.5} />
      </button>
    );
  }

  return (
    <div className="flex flex-col gap-1.5">
      <button
        type="button"
        onClick={openQuickAdd}
        className="inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-gold-500/45 bg-gold-500/12 px-3 text-sm font-medium text-gold-300 transition-colors hover:bg-gold-500/22"
      >
        <Plus size={16} strokeWidth={2.5} />
        快速记录一局
      </button>
      <Link
        to="/matches/new"
        className="inline-flex h-9 items-center justify-center gap-1 rounded-lg border border-line bg-base-800 px-3 text-xs text-ink-400 transition-colors hover:bg-base-700 hover:text-ink-200"
      >
        完整对局记录
        <ChevronRight size={13} />
      </Link>
    </div>
  );
}
