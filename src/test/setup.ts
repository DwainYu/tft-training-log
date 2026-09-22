import { afterEach, beforeEach } from "vitest";
import { cleanup } from "@testing-library/react";
import "fake-indexeddb/auto";
import "@testing-library/jest-dom/vitest";

// IndexedDB is not available in jsdom; `fake-indexeddb/auto` provides it.
// jsdom also never matches media queries, which would pin every responsive
// component to its mobile branch. Evaluate width like a browser instead.
const listeners = new Set<() => void>();

function mediaMatches(query: string): boolean {
  const width = window.innerWidth;
  const min = /min-width:\s*(\d+)px/.exec(query);
  const max = /max-width:\s*(\d+)px/.exec(query);
  if (min && width < Number(min[1])) return false;
  if (max && width > Number(max[1])) return false;
  return true;
}

beforeEach(() => {
  Object.defineProperty(window, "matchMedia", {
    configurable: true,
    writable: true,
    value: (query: string) => ({
      media: query,
      get matches() {
        return mediaMatches(query);
      },
      onchange: null,
      addListener: (cb: () => void) => listeners.add(cb),
      removeListener: (cb: () => void) => listeners.delete(cb),
      addEventListener: (_: string, cb: () => void) => listeners.add(cb),
      removeEventListener: (_: string, cb: () => void) => listeners.delete(cb),
      dispatchEvent: () => false,
    }),
  });
  Object.defineProperty(window, "innerWidth", { configurable: true, writable: true, value: 1280 });
});

// Vitest globals are off, so React Testing Library cannot register its own
// auto-cleanup — do it here or components accumulate across tests.
afterEach(cleanup);

export { mediaMatches };
