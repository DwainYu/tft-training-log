import { Loader2 } from "lucide-react";

/** Loading state for `useLiveQuery` (undefined = still reading IndexedDB). */
export function Spinner({ label = "读取本地数据" }: { label?: string }) {
  return (
    <div className="panel flex items-center gap-2 px-4 py-6 text-sm text-ink-400">
      <Loader2 size={16} className="animate-spin" />
      {label}…
    </div>
  );
}
