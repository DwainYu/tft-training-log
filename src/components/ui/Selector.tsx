import type { ReactNode } from "react";
import { Search } from "lucide-react";
import { Input } from "./Field";

/**
 * Shared *presentation* pieces for the pickers (composition / augment / item).
 *
 * They are deliberately dumb: no generics, no data access, no state. Each
 * selector keeps its own business rules (ranking, dupe policy, ordering) and
 * only borrows the markup that had started to repeat three times.
 */

/** The scroll container every picker opens under its input. */
export function SelectorPanel({
  id,
  children,
  className = "",
}: {
  id?: string;
  children: ReactNode;
  className?: string;
}): ReactNode {
  return (
    <div
      id={id}
      className={`mt-1.5 max-h-56 overflow-y-auto rounded-lg border border-line bg-base-900 p-1.5 ${className}`}
    >
      {children}
    </div>
  );
}

export function SelectorSectionTitle({ children }: { children: ReactNode }): ReactNode {
  return <p className="px-1 pb-1.5 text-[11px] font-medium text-ink-600">{children}</p>;
}

export function SelectorEmpty({ children }: { children: ReactNode }): ReactNode {
  return <p className="px-1 py-2 text-[11px] text-ink-600">{children}</p>;
}

/**
 * Search box: focus opens the panel, `onKeyDown` stays with the selector so
 * each one can define its own Esc / Enter behaviour.
 */
export function SelectorSearchInput({
  id,
  value,
  placeholder,
  onChange,
  onFocus,
  onKeyDown,
  expanded,
  controlsId,
  icon = false,
  trailing,
  className = "",
}: {
  id?: string;
  value: string;
  placeholder?: string;
  onChange: (value: string) => void;
  onFocus?: () => void;
  onKeyDown?: (e: React.KeyboardEvent<HTMLInputElement>) => void;
  expanded?: boolean;
  controlsId?: string;
  icon?: boolean;
  trailing?: ReactNode;
  className?: string;
}): ReactNode {
  return (
    <div className="relative">
      {icon && (
        <Search
          size={14}
          className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-600"
        />
      )}
      <Input
        id={id}
        value={value}
        placeholder={placeholder}
        autoComplete="off"
        role="combobox"
        aria-expanded={expanded}
        aria-autocomplete="list"
        aria-controls={controlsId}
        className={`${icon ? "pl-9" : ""} ${value && trailing ? "pr-9" : ""} ${className}`}
        onChange={(e) => onChange(e.target.value)}
        onFocus={onFocus}
        onKeyDown={onKeyDown}
      />
      {value && trailing && (
        <span className="absolute right-2 top-1/2 flex -translate-y-1/2 items-center">
          {trailing}
        </span>
      )}
    </div>
  );
}

/**
 * One picked value. `onClick` makes the whole chip the action (composition
 * options), `onRemove` renders an × instead (augment / item selections).
 */
export function SelectorChip({
  label,
  index,
  meta,
  muted = false,
  selected = false,
  onClick,
  onRemove,
  removeLabel,
}: {
  label: string;
  /** Slot number — only for lists whose order means something (augments). */
  index?: number;
  meta?: string;
  muted?: boolean;
  selected?: boolean;
  onClick?: () => void;
  onRemove?: () => void;
  removeLabel?: string;
}): ReactNode {
  const tone = muted
    ? "border-dashed border-line bg-base-800/60 text-ink-400"
    : selected
      ? "border-gold-400 bg-gold-500/25 text-gold-300"
      : "border-line bg-base-800 text-ink-200 hover:border-gold-500/45 hover:text-gold-300";
  const shell = "inline-flex min-h-8 items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs";

  const body = (
    <>
      {index !== undefined && <span className="num text-[10px] text-ink-600">{index}</span>}
      <span>{label}</span>
      {meta && <span className="text-[10px] text-ink-600">{meta}</span>}
    </>
  );

  if (onRemove) {
    return (
      <span className={`${shell} ${muted ? tone : "border-gold-500/45 bg-gold-500/12 text-gold-300"}`}>
        {body}
        <button
          type="button"
          aria-label={removeLabel ?? `移除${label}`}
          onClick={onRemove}
          className="flex size-5 items-center justify-center rounded hover:bg-gold-500/20"
        >
          <span aria-hidden className="text-[13px] leading-none">
            ×
          </span>
        </button>
      </span>
    );
  }

  return (
    <button type="button" onClick={onClick} className={`${shell} ${tone}`}>
      {body}
    </button>
  );
}

/** Full-width list row: name, optional badge (category) and a truncated line. */
export function SelectorOptionRow({
  label,
  badge,
  summary,
  highlighted = false,
  onSelect,
}: {
  label: string;
  badge?: string;
  summary?: string;
  highlighted?: boolean;
  onSelect: () => void;
}): ReactNode {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={[
        "flex w-full flex-col items-start gap-0.5 rounded-lg border px-2.5 py-2 text-left transition-colors",
        highlighted
          ? "border-gold-500/45 bg-gold-500/10 hover:bg-gold-500/20"
          : "border-transparent hover:bg-base-800",
      ].join(" ")}
    >
      <span className="flex w-full items-center gap-1.5 text-xs text-ink-50">
        <span className="truncate">{label}</span>
        {badge && (
          <span className="shrink-0 rounded border border-line px-1 text-[10px] text-ink-600">
            {badge}
          </span>
        )}
      </span>
      {summary && <span className="w-full truncate text-[11px] text-ink-600">{summary}</span>}
    </button>
  );
}
