/**
 * Static TFT descriptions carry Riot markup (`<Bright>`, `@Gold@`, `<br>`).
 * Strip it into one readable line before it reaches the UI — the data stays
 * offline and untouched, only the rendered text is cleaned.
 */

export function stripRiotMarkup(text: string | undefined): string {
  if (!text) return "";
  return text
    .replace(/<[^>]*>/g, "")
    .replace(/@[^@\s]+@/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

export function truncateText(text: string, max: number): string {
  return text.length > max ? `${text.slice(0, max)}…` : text;
}
