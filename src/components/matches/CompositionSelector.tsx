import { useMemo, useRef, useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { X } from "lucide-react";
import { compositionSuggestions } from "../../services/composition-usage-service";
import { normalizeCompositionKey } from "../../domain/composition/composition";
import {
  flattenCompositionOptions,
  searchCompositionOptions,
  type CompositionOption,
  type CompositionSections,
} from "../../domain/composition/suggestions";
import {
  SelectorChip,
  SelectorPanel,
  SelectorSearchInput,
  SelectorSectionTitle,
} from "../ui/Selector";
import { useOutsideClick } from "../../lib/use-outside-click";

const EMPTY_SECTIONS: CompositionSections = { recent: [], frequent: [], preset: [] };

/**
 * The preset list is *not* a composition catalogue — the project has no
 * Composition entity, so these are Set 18 trait names offered as starting
 * tags. Saying so in the UI keeps 阵容 (the player's own label for a line)
 * and 羁绊 (the synergies a board had) apart.
 */
export const PRESET_NOTE = "来自 Set 18 羁绊名的起始建议，不是阵容列表";

/**
 * Composition picker: 最近使用 / 常用 / 更多, plus search and free text.
 *
 * The component owns nothing but presentation — ranking, dedupe and presets
 * come from `compositionSuggestions()` (service) and the pure suggestion
 * module behind it. Picking an option only writes the form value: usage is
 * still counted once, at match creation.
 */
export function CompositionSelector({
  id,
  value,
  onChange,
  placeholder = "例如：福牛 / 法师",
}: {
  id?: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}) {
  const sections = useLiveQuery(() => compositionSuggestions(), [], EMPTY_SECTIONS);
  const [open, setOpen] = useState(false);
  const boxRef = useRef<HTMLDivElement>(null);
  useOutsideClick(boxRef, open, () => setOpen(false));

  const options = useMemo(() => flattenCompositionOptions(sections), [sections]);
  // The field doubles as the search box: whatever is typed filters the list and
  // is also the custom composition the player may want to keep.
  const query = normalizeCompositionKey(value);
  const results = useMemo(() => searchCompositionOptions(options, value), [options, value]);
  const searching = query !== "";
  const hasExact = results.some((o) => o.key === query);

  function select(option: CompositionOption) {
    onChange(option.key);
    setOpen(false);
  }

  function keepTyped() {
    onChange(query);
    setOpen(false);
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Escape" && open) {
      setOpen(false);
      // see AugmentSelector: keep the Escape from reaching an enclosing modal
      e.stopPropagation();
      e.preventDefault();
      return;
    }
    // Enter accepts the typed text — an exact hit is selected so the stored
    // value ends up normalized, anything else stays the player's own wording.
    if (e.key === "Enter") {
      e.preventDefault();
      const exact = options.find((o) => o.key === query);
      if (exact) select(exact);
      else setOpen(false);
    }
  }

  return (
    <div ref={boxRef}>
      <SelectorSearchInput
        id={id}
        value={value}
        placeholder={placeholder}
        expanded={open}
        controlsId={id ? `${id}-options` : undefined}
        onChange={(next) => {
          onChange(next);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onKeyDown={onKeyDown}
        trailing={
          <button
            type="button"
            aria-label="清空阵容"
            onClick={() => {
              onChange("");
              setOpen(true);
            }}
            className="flex size-6 items-center justify-center rounded text-ink-600 hover:bg-base-800 hover:text-ink-200"
          >
            <X size={14} />
          </button>
        }
      />

      {open && (
        <SelectorPanel id={id ? `${id}-options` : undefined}>
          {searching ? (
            <>
              <SelectorSectionTitle>搜索结果</SelectorSectionTitle>
              {results.length === 0 ? (
                <p className="px-1 py-2 text-[11px] text-ink-600">没有找到「{query}」</p>
              ) : (
                <Chips options={results} selectedKey={query} onSelect={select} />
              )}
              {!hasExact && (
                <button
                  type="button"
                  onClick={keepTyped}
                  className="mt-1 flex w-full items-center gap-1.5 rounded-lg border border-gold-500/45 bg-gold-500/12 px-2.5 py-2 text-xs text-gold-300 hover:bg-gold-500/22"
                >
                  使用「{query}」
                </button>
              )}
            </>
          ) : (
            <>
              <Section
                title="最近使用"
                options={sections.recent}
                empty="暂无最近使用"
                selectedKey={query}
                onSelect={select}
              />
              <Section
                title="常用阵容"
                options={sections.frequent}
                empty="暂无常用阵容"
                selectedKey={query}
                onSelect={select}
              />
              <Section
                title="预置标签"
                note={PRESET_NOTE}
                options={sections.preset}
                empty="暂无预置标签"
                selectedKey={query}
                onSelect={select}
              />
            </>
          )}
        </SelectorPanel>
      )}
    </div>
  );
}

function Section({
  title,
  note,
  options,
  empty,
  selectedKey,
  onSelect,
}: {
  title: string;
  note?: string;
  options: readonly CompositionOption[];
  empty: string;
  selectedKey: string;
  onSelect: (option: CompositionOption) => void;
}) {
  return (
    <div className="py-1">
      <SelectorSectionTitle>{title}</SelectorSectionTitle>
      {note && <p className="px-1 pb-1.5 text-[11px] leading-relaxed text-ink-600">{note}</p>}
      {options.length === 0 ? (
        <p className="px-1 text-[11px] text-ink-600">{empty}</p>
      ) : (
        <Chips options={options} selectedKey={selectedKey} onSelect={onSelect} />
      )}
    </div>
  );
}

function Chips({
  options,
  selectedKey,
  onSelect,
}: {
  options: readonly CompositionOption[];
  selectedKey: string;
  onSelect: (option: CompositionOption) => void;
}) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {options.map((o) => (
        <SelectorChip
          key={`${o.source}:${o.key}`}
          label={o.label}
          meta={o.usageCount === undefined ? undefined : `${o.usageCount} 次`}
          selected={o.key === selectedKey}
          onClick={() => onSelect(o)}
        />
      ))}
    </div>
  );
}
