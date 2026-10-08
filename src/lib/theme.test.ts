import { beforeEach, describe, expect, it } from "vitest";
import { applyTheme, readStoredTheme, storeTheme, THEME_STORAGE_KEY } from "./theme";

/**
 * The theme contract the whole UI rests on: light is the default, "dark" is
 * the only stored override, and the `<html>` class is what the CSS keys off.
 */
beforeEach(() => {
  localStorage.clear();
  applyTheme("light");
});

describe("theme", () => {
  it("defaults to light when nothing is stored", () => {
    expect(readStoredTheme()).toBe("light");
  });

  it("reads a stored dark preference back", () => {
    storeTheme("dark");
    expect(readStoredTheme()).toBe("dark");
  });

  it("treats a corrupted storage value as light, not as a crash", () => {
    localStorage.setItem(THEME_STORAGE_KEY, "oled");
    expect(readStoredTheme()).toBe("light");
  });

  it("mirrors the theme onto <html> as the dark class", () => {
    applyTheme("dark");
    expect(document.documentElement.classList.contains("dark")).toBe(true);
    applyTheme("light");
    expect(document.documentElement.classList.contains("dark")).toBe(false);
  });
});
