import type { Match } from "../../domain/types";
import { getActiveSetData } from "./registry";
import { augmentRepository, championRepository, itemRepository, traitRepository } from "./repositories";

/**
 * Cross-checks a match's canonical ids against the active set's static data.
 *
 * Deliberately lives in the data layer, not the domain: the domain stays
 * storage-agnostic, and services decide when a write goes through here.
 * Records without any ids pass untouched (old data stays valid).
 */
export function validateMatchStaticData(
  match: Pick<
    Match,
    "set" | "traitIds" | "coreUnitIds" | "coreItemIds" | "augmentIds"
  >,
): string[] {
  const errors: string[] = [];
  const knownSet = getActiveSetData().manifest.set;

  if (match.set !== undefined && match.set !== knownSet) {
    errors.push(`静态数据目前只覆盖 Set ${knownSet}，无法校验 Set ${match.set} 的记录`);
    return errors;
  }

  const check = (
    ids: string[] | undefined,
    lookup: (id: string) => unknown,
    label: string,
  ) => {
    for (const id of ids ?? []) {
      if (!lookup(id)) errors.push(`${label} id "${id}" 不存在于 Set ${knownSet} 静态数据`);
    }
  };

  check(match.coreUnitIds, (id) => championRepository.getChampionById(id), "棋子");
  check(match.traitIds, (id) => traitRepository.getTraitById(id), "羁绊");
  check(match.coreItemIds, (id) => itemRepository.getItemById(id), "装备");
  check(match.augmentIds, (id) => augmentRepository.getAugmentById(id), "强化符文");

  return errors;
}
