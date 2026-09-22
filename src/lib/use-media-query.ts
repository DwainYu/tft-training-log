import { useEffect, useState } from "react";

/**
 * Renders one layout per breakpoint instead of shipping duplicate DOM and
 * hiding it with CSS. Desktop is the priority target (recording happens on a
 * PC), mobile gets the compact card list.
 */
export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(() => evaluate(query));

  useEffect(() => {
    const mql = typeof window !== "undefined" ? window.matchMedia?.(query) : undefined;
    if (!mql) return;
    const onChange = () => setMatches(mql.matches);
    onChange();
    mql.addEventListener?.("change", onChange);
    return () => mql.removeEventListener?.("change", onChange);
  }, [query]);

  return matches;
}

function evaluate(query: string): boolean {
  if (typeof window === "undefined" || !window.matchMedia) return true;
  try {
    return window.matchMedia(query).matches;
  } catch {
    return true;
  }
}

export const DESKTOP_QUERY = "(min-width: 768px)";
