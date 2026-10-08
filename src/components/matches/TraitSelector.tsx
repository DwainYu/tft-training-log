import { useMemo } from "react";
import {
  searchTraits,
  traitBreakpointLabel,
  traitCount,
  traitOptions,
} from "../../services/trait-service";
import {
  SelectorChip,
  SelectorEmpty,
  SelectorOptionRow,
  SelectorPanel,
  SelectorSearchInput,
  SelectorSectionTitle,
} from "../ui/Selector";
import { useListPickerState } from "../../lib/use-list-picker-state";

/**
 * Trait picker over the bundled Set 18 snapshot (36 traits).
 *
 * Business rules, taken from what `Match.traitIds` actually is:
 *  - **multi + unordered**: the traits a board had are a set, so no slot
 *    numbers and no ordering (unlike augments, which are 第一/第二/第三);
 *  - **no duplicates**: the domain dedupes `traitIds`, and "had 法师 twice"
 *    carries no information;
 *  - **no cap**: the number of active traits depends on the board, so none is
 *    invented here;
 *  - **legacy text is kept**: shorthand ("重装", "先锋") is not in the snapshot,
 *    so unresolved typed entries stay as muted chips and are re-saved verbatim.
 */
export function TraitSelector({
  id,
  value,
  onChange,
  legacy = [],
  onLegacyChange,
}: {
  id?: string;
  value: string[];
  onChange: (ids: string[]) => void;
  /** Free-text entries from older records that no static id matches. */
  legacy?: string[];
  onLegacyChange?: (values: string[]) => void;
}) {
  const selected = useMemo(() => traitOptions(value), [value]);
  const chosen = useMemo(() => new Set(value), [value]);

  const { open, query, boxRef, changeQuery, openPanel, add, onKeyDown } = useListPickerState({
    // no cap: the number of active traits depends on the board
    canAdd: true,
    getFirstResultId,
    onAdd: (id) => {
      // "had 法师 twice" carries no information
      if (chosen.has(id)) return false;
      onChange([...value, id]);
      return true;
    },
  });

  const results = useMemo(() => searchTraits(query).filter((o) => !chosen.has(o.id)), [query, chosen]);

  /** The row Enter takes: the first of the list rendered below. */
  function getFirstResultId() {
    return results[0]?.id;
  }

  function remove(id: string) {
    onChange(value.filter((v) => v !== id));
  }

  const hasSelection = selected.length > 0 || legacy.length > 0;

  return (
    <div ref={boxRef}>
      {hasSelection && (
        <div className="mb-1.5">
          <p className="mb-1 text-[11px] font-medium text-ink-600">当前选择</p>
          <div className="flex flex-wrap gap-1.5">
            {selected.map((option) => (
              <SelectorChip
                key={option.id}
                label={option.name}
                onRemove={() => remove(option.id)}
              />
            ))}
            {legacy.map((text) => (
              <SelectorChip
                key={`legacy:${text}`}
                label={text}
                meta="旧记录"
                muted
                removeLabel={`移除旧记录文本${text}`}
                onRemove={
                  onLegacyChange
                    ? () => onLegacyChange(legacy.filter((t) => t !== text))
                    : undefined
                }
              />
            ))}
          </div>
        </div>
      )}

      <SelectorSearchInput
        id={id}
        value={query}
        placeholder="搜索羁绊（名称 / 效果）"
        icon
        expanded={open}
        controlsId={id ? `${id}-options` : undefined}
        onChange={changeQuery}
        onFocus={openPanel}
        onKeyDown={onKeyDown}
      />

      {open && (
        <SelectorPanel id={id ? `${id}-options` : undefined}>
          {results.length === 0 ? (
            <SelectorEmpty>
              {query.trim() ? `没有找到「${query.trim()}」` : "没有更多可选择的羁绊"}
            </SelectorEmpty>
          ) : (
            <>
              {!query.trim() && (
                <SelectorSectionTitle>
                  全部羁绊（显示前 {results.length} / 共 {traitCount()} 个，输入关键词筛选）
                </SelectorSectionTitle>
              )}
              {results.map((option, i) => (
                <SelectorOptionRow
                  key={option.id}
                  label={option.name}
                  badge={
                    option.breakpoints.length > 0 ? traitBreakpointLabel(option.breakpoints) : undefined
                  }
                  summary={option.summary}
                  highlighted={i === 0}
                  onSelect={() => add(option.id)}
                />
              ))}
            </>
          )}
        </SelectorPanel>
      )}
    </div>
  );
}
