import { useRef, useState, type KeyboardEvent, type RefObject } from "react";
import { useOutsideClick } from "./use-outside-click";

/** All the picker needs to know about a row: an id to hand back on pick. */
export interface PickerRow {
  readonly id: string;
}

export interface ListPickerState {
  /** Whether the option panel is open. */
  open: boolean;
  /** Current search text. Cleared by a committed `add`, not by closing. */
  query: string;
  /** Put on the element wrapping input + panel; outside clicks close on it. */
  boxRef: RefObject<HTMLDivElement | null>;
  /** Type in the search box. Typing opens the panel. */
  changeQuery: (next: string) => void;
  /** Focus opened the panel. */
  openPanel: () => void;
  /** Close the panel, leaving the value alone. Escape and outside click. */
  closePanel: () => void;
  /**
   * Commit a row: hands the id to `onAdd`, and on a commit clears the query.
   * The panel deliberately stays open, because picking is usually several rows
   * in a row.
   */
  add: (id: string) => void;
  /** For the search input: consumes Escape, picks the first row on Enter. */
  onKeyDown: (e: KeyboardEvent<HTMLInputElement>) => void;
}

/**
 * The interaction half of a search-and-pick list: is the panel open, what has
 * been typed, and what Escape / Enter / an outside click mean.
 *
 * It knows nothing about *what* is being picked. Rows arrive as `{ id }` (the
 * search itself, the cap and the duplicate rule stay in the caller), so the
 * same hook drives an ordered list of three augments and an unordered set of
 * traits without either of them leaking in here.
 *
 * **Escape is consumed here, not merely handled.** While the panel is open the
 * hook calls `preventDefault()` *and* `stopPropagation()` on the synthetic
 * event. React's delegated listener sits below `document`, so stopping
 * propagation means the native keydown never reaches the document-level
 * listener `Modal` installs: the panel closes and the enclosing dialog keeps
 * the draft the player was typing. Both calls are load-bearing and neither is
 * an optimisation — that is why they live in one place instead of in each
 * selector. When the panel is closed nothing is consumed and Escape travels on
 * to the dialog, which is what makes "one Escape, one layer" true.
 */
export function useListPickerState({
  canAdd,
  getFirstResultId,
  onAdd,
}: {
  /** The caller's cap, as a plain yes/no: may a row be committed right now? */
  canAdd: boolean;
  /**
   * Id of the row Enter should take — the highlighted one, i.e. the first of
   * the list as it stands. Called on the keypress, so it reads the caller's
   * current results without this hook having to know how they are searched.
   */
  getFirstResultId: () => string | undefined;
  /** Commit a row; returns whether it actually took (so a rejected id is not mistaken for a pick). */
  onAdd: (id: string) => boolean;
}): ListPickerState {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const boxRef = useRef<HTMLDivElement>(null);

  function closePanel() {
    setOpen(false);
  }

  useOutsideClick(boxRef, open, closePanel);

  function changeQuery(next: string) {
    setQuery(next);
    setOpen(true);
  }

  function add(id: string) {
    if (!canAdd) return;
    if (!onAdd(id)) return;
    // Reset the search but leave the panel open: the next pick should start
    // from the full list again, not from what was just typed.
    setQuery("");
  }

  function onKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Escape" && open) {
      setOpen(false);
      // The `stopPropagation` is what keeps a picker nested in a dialog from
      // taking the dialog down with it; `preventDefault` is kept alongside it
      // as the independent fallback Modal also checks.
      e.stopPropagation();
      e.preventDefault();
      return;
    }
    if (e.key === "Enter") {
      e.preventDefault();
      const first = getFirstResultId();
      if (first !== undefined) add(first);
    }
  }

  // No `toggle`: nothing in the app has a control that flips the panel, and
  // Escape plus the outside click are the only two ways it closes.
  return { open, query, boxRef, changeQuery, openPanel: () => setOpen(true), closePanel, add, onKeyDown };
}
