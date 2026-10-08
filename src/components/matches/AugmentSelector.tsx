import { useMemo } from "react";
import {
  augmentCount,
  augmentOptions,
  searchAugments,
} from "../../services/augment-service";
import {
  SelectorChip,
  SelectorEmpty,
  SelectorOptionRow,
  SelectorPanel,
  SelectorSearchInput,
  SelectorSectionTitle,
} from "../ui/Selector";
import { useListPickerState } from "../../lib/use-list-picker-state";

/** A TFT game hands out three augments, in order — the order is the data. */
export const MAX_AUGMENTS = 3;

/**
 * Augment picker: search + click over the bundled Set 18 snapshot (592 rows).
 *
 * It is a pure form control: it reports ids through `onChange` and writes
 * nothing itself. Selection is an *ordered list* (第一 / 第二 / 第三), so the
 * value is `string[]`, never a Set — hence the slot numbers on the chips.
 *
 * Legacy text is kept, like the item and trait pickers, but it deliberately
 * does **not** occupy a slot: `full` is measured against `value` (canonical
 * ids) alone. A record may legitimately hold three unresolved names from an
 * older patch plus three real picks, and counting the dead text against the
 * cap would block the player from recording the augments they actually saw.
 *
 * The cap itself is a UI affordance only: nothing in the domain, the export or
 * the stats enforces `MAX_AUGMENTS`, so a hand-edited or imported record may
 * carry more. Do not read "three" as a data invariant.
 */
export function AugmentSelector({
  id,
  value,
  onChange,
  legacy = [],
  onLegacyChange,
  max = MAX_AUGMENTS,
}: {
  id?: string;
  value: string[];
  onChange: (ids: string[]) => void;
  /** Free-text entries from older records that no static id matches. */
  legacy?: string[];
  onLegacyChange?: (values: string[]) => void;
  max?: number;
}) {
  const selected = useMemo(() => augmentOptions(value), [value]);
  // Already-picked augments are filtered out: the same game cannot take one
  // twice, and the row simply not being there is easier to understand than a
  // disabled row.
  const chosen = useMemo(() => new Set(value), [value]);
  const full = value.length >= max;
  const hasSelection = selected.length > 0 || legacy.length > 0;

  const { open, query, boxRef, changeQuery, openPanel, add, onKeyDown } = useListPickerState({
    // The three-augment cap is this component's business rule, so the decision
    // is made here and handed over as a plain yes/no.
    canAdd: !full,
    getFirstResultId,
    onAdd: (id) => {
      // the same game cannot take one augment twice
      if (chosen.has(id)) return false;
      onChange([...value, id]);
      return true;
    },
  });

  const results = useMemo(() => searchAugments(query).filter((o) => !chosen.has(o.id)), [query, chosen]);

  /** The row Enter takes: the first of the list rendered below. */
  function getFirstResultId() {
    return results[0]?.id;
  }

  function remove(id: string) {
    onChange(value.filter((v) => v !== id));
  }

  return (
    <div ref={boxRef}>
      {hasSelection && (
        <div className="mb-1.5">
          <p className="mb-1 text-[11px] font-medium text-ink-600">
            已选择（{selected.length}/{max}）
          </p>
          <div className="flex flex-wrap gap-1.5">
            {selected.map((option, i) => (
              <SelectorChip
                key={option.id}
                label={option.name}
                index={i + 1}
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
        placeholder={full ? `已选满 ${max} 个` : "搜索海克斯（名称 / 描述）"}
        icon
        expanded={open}
        controlsId={id ? `${id}-options` : undefined}
        onChange={changeQuery}
        onFocus={openPanel}
        onKeyDown={onKeyDown}
      />

      {open && full && (
        <div className="mt-1.5 rounded-lg border border-line bg-base-900 px-2.5 py-2 text-[11px] text-ink-600">
          已选满 {max} 个海克斯；删除一个后可以继续选择。
        </div>
      )}

      {open && !full && (
        <SelectorPanel id={id ? `${id}-options` : undefined}>
          {results.length === 0 ? (
            <SelectorEmpty>
              {query.trim() ? `没有找到「${query.trim()}」` : "没有更多可选择的海克斯"}
            </SelectorEmpty>
          ) : (
            <>
              {!query.trim() && (
                <SelectorSectionTitle>
                  全部海克斯（显示前 {results.length} / 共 {augmentCount()} 个，输入关键词筛选）
                </SelectorSectionTitle>
              )}
              {results.map((option, i) => (
                <SelectorOptionRow
                  key={option.id}
                  label={option.name}
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
