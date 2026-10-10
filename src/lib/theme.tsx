import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

export type Theme = "light" | "dark";

export const THEME_STORAGE_KEY = "tft-theme";

/**
 * Reads the persisted theme. Anything other than a stored "dark" — including
 * a missing key or an unusable localStorage — is the light default.
 */
export function readStoredTheme(): Theme {
  try {
    return localStorage.getItem(THEME_STORAGE_KEY) === "dark" ? "dark" : "light";
  } catch {
    return "light";
  }
}

/** Mirrors the theme onto `<html>` as the `dark` class the CSS keys off. */
export function applyTheme(theme: Theme): void {
  document.documentElement.classList.toggle("dark", theme === "dark");
}

export function storeTheme(theme: Theme): void {
  try {
    localStorage.setItem(THEME_STORAGE_KEY, theme);
  } catch {
    // A blocked localStorage must not break the toggle; the theme just
    // won't survive a reload.
  }
}

interface ThemeContextValue {
  theme: Theme;
  /** Convenience for chart literals: `theme === "dark"`. */
  dark: boolean;
  toggle: () => void;
}

const ThemeContext = createContext<ThemeContextValue>({
  theme: "light",
  dark: false,
  toggle: () => {},
});

export function ThemeProvider({ children }: { children: ReactNode }) {
  // index.html applies the persisted class before first paint; this state
  // only mirrors it so React (and the charts) re-render on toggle.
  const [theme, setTheme] = useState<Theme>(() => readStoredTheme());

  useEffect(() => {
    applyTheme(theme);
  }, [theme]);

  const value = {
    theme,
    dark: theme === "dark",
    toggle: () =>
      setTheme((current) => {
        const next: Theme = current === "dark" ? "light" : "dark";
        storeTheme(next);
        return next;
      }),
  };

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeContextValue {
  return useContext(ThemeContext);
}
