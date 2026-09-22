import { MAX_PLACEMENT, TOP4_PLACEMENT } from "../../domain/types";
import { placementTone } from "../../domain/match/match";

const TONE_SELECTED: Record<string, string> = {
  gold: "border-gold-400 bg-gold-500/25 text-gold-300",
  good: "border-emerald-400/70 bg-emerald-500/20 text-emerald-200",
  bad: "border-red-400/70 bg-red-500/18 text-red-200",
};

/** Placement is the single most-used field: one row of 8, no scrolling, keys 1–8. */
export function PlacementPicker({
  value,
  onChange,
}: {
  value: number | undefined;
  onChange: (placement: number) => void;
}) {
  return (
    <div
      className="grid grid-cols-4 gap-1.5 sm:grid-cols-8"
      role="radiogroup"
      aria-label="最终名次"
    >
      {Array.from({ length: MAX_PLACEMENT }, (_, i) => i + 1).map((p) => {
        const selected = value === p;
        const tone = placementTone(p);
        return (
          <button
            key={p}
            type="button"
            role="radio"
            aria-checked={selected}
            aria-label={`第 ${p} 名`}
            onClick={() => onChange(p)}
            className={[
              "num flex h-11 flex-col items-center justify-center rounded-lg border text-base font-semibold transition-colors",
              selected
                ? TONE_SELECTED[tone]
                : "border-line bg-base-900/70 text-ink-400 hover:bg-base-800 hover:text-ink-200",
              p === TOP4_PLACEMENT && "mr-0 sm:border-r-2",
            ]
              .filter(Boolean)
              .join(" ")}
          >
            {p}
          </button>
        );
      })}
    </div>
  );
}
