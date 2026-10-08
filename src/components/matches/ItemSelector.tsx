import { useMemo } from "react";
import {
  itemCount,
  itemOptions,
  searchItems,
} from "../../services/item-service";
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
 * Item picker over the bundled Set 18 snapshot (186 items).
 *
 * Business rules, deliberately different from the augment picker:
 *  - **unordered**: `coreItemIds` is "the items that mattered this game", so no
 *    slot numbers — there is no "第一件装备" in the data model;
 *  - **no duplicates**: the domain already dedupes `coreItemIds`, and without a
 *    unit association a repeated id would carry no information;
 *  - **legacy text is kept**: old records store shorthand ("无尽", "蓝buff")
 *    that does not exist in the snapshot, so those entries are shown as muted
 *    chips and re-saved verbatim instead of being dropped.
 */
export function ItemSelector({
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
  const selected = useMemo(() => itemOptions(value), [value]);
  const chosen = useMemo(() => new Set(value), [value]);

  const { open, query, boxRef, changeQuery, openPanel, add, onKeyDown } = useListPickerState({
    // no cap: how many items mattered is the player's call, not a rule
    canAdd: true,
    getFirstResultId,
    onAdd: (id) => {
      // a repeated id would carry no information without a unit association
      if (chosen.has(id)) return false;
      onChange([...value, id]);
      return true;
    },
  });

  const results = useMemo(() => searchItems(query).filter((o) => !chosen.has(o.id)), [query, chosen]);

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
                meta={option.categoryLabel}
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
        placeholder="搜索装备（名称 / 描述）"
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
              {query.trim() ? `没有找到「${query.trim()}」` : "没有更多可选择的装备"}
            </SelectorEmpty>
          ) : (
            <>
              {!query.trim() && (
                <SelectorSectionTitle>
                  全部装备（显示前 {results.length} / 共 {itemCount()} 件，输入关键词筛选）
                </SelectorSectionTitle>
              )}
              {results.map((option, i) => (
                <SelectorOptionRow
                  key={option.id}
                  label={option.name}
                  badge={option.categoryLabel}
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
