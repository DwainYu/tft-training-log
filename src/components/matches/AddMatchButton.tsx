import { Link } from "react-router-dom";
import { Plus } from "lucide-react";

/**
 * Entry point for logging a match. Opens the full "新增对局" form;
 * Quick Add lives inside it as the default path.
 */
export function AddMatchButton({ compact }: { compact?: boolean }) {
  return (
    <Link
      to="/matches/new"
      className={[
        "inline-flex items-center justify-center gap-2 rounded-lg border border-gold-500/45 bg-gold-500/12 px-3 py-2 text-sm font-medium text-gold-300 transition-colors hover:bg-gold-500/20",
        compact ? "size-9 p-0" : "w-full",
      ]
        .filter(Boolean)
        .join(" ")}
      title="新增对局"
    >
      <Plus size={16} strokeWidth={2.5} className={compact ? "" : "shrink-0"} />
      {!compact && "新增对局"}
    </Link>
  );
}
