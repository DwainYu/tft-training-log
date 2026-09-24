import { set18Data } from "./set18";
import type { TftDataSnapshot } from "./types";

/**
 * Set registry: which sets the app knows about, and which one is active.
 * A new set (19, 20, …) is added by importing its snapshot here — the rest
 * of the app only ever talks to the active set through `getActiveSetData()`,
 * never to a `set18` string.
 */
export interface SetDefinition {
  id: string;
  name: string;
  active: boolean;
  dataVersion: string;
}

export const SET_DEFINITIONS: SetDefinition[] = [
  {
    id: "set18",
    name: set18Data.manifest.name,
    active: true,
    dataVersion: set18Data.manifest.dataVersion,
  },
];

export const ACTIVE_SET_ID = "set18";

export const getActiveSetDefinition = (): SetDefinition => {
  const def = SET_DEFINITIONS.find((d) => d.active);
  if (!def) throw new Error("no active set registered");
  return def;
};

export function getSetData(setId: string = ACTIVE_SET_ID): TftDataSnapshot {
  switch (setId) {
    case "set18":
      return set18Data;
    default:
      throw new Error(`unknown set "${setId}"`);
  }
}

/** The static data every lookup API resolves against today. */
export const getActiveSetData = (): TftDataSnapshot => getSetData(ACTIVE_SET_ID);
