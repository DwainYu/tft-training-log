import { MISTAKE_TYPE_LIST, mistakeLabel } from "../../domain/labels";
import type { MistakeType } from "../../domain/types";
import { Select } from "../ui/Field";
import type { SelectHTMLAttributes } from "react";

export function MistakeSelect({
  value,
  onChange,
  ...rest
}: {
  value: MistakeType | "";
  onChange: (v: MistakeType | "") => void;
} & Omit<SelectHTMLAttributes<HTMLSelectElement>, "value" | "onChange">) {
  return (
    <Select
      value={value}
      onChange={(e) => onChange(e.target.value as MistakeType | "")}
      {...rest}
    >
      <option value="">未选择</option>
      {MISTAKE_TYPE_LIST.map((t) => (
        <option key={t} value={t}>
          {mistakeLabel(t)} · {t}
        </option>
      ))}
    </Select>
  );
}

/** Compact pill row — better than a select when the player is in a hurry. */
export function MistakePicker({
  value,
  onChange,
}: {
  value: MistakeType | "";
  onChange: (v: MistakeType | "") => void;
}) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {MISTAKE_TYPE_LIST.map((t) => {
        const selected = value === t;
        return (
          <button
            key={t}
            type="button"
            aria-pressed={selected}
            onClick={() => onChange(selected ? "" : t)}
            className={[
              "rounded-md border px-2 py-1 text-xs transition-colors",
              selected
                ? "border-gold-500/50 bg-gold-500/15 text-gold-300"
                : "border-line bg-base-900/60 text-ink-400 hover:bg-base-800 hover:text-ink-200",
            ].join(" ")}
          >
            {mistakeLabel(t)}
          </button>
        );
      })}
    </div>
  );
}
