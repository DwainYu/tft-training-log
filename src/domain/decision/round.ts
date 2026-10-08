/**
 * `Decision.round` is a free string the player types ("2-1", "最终", "mid").
 * Nothing in the model structures it, so ordering is derived at read time —
 * never guessed: a value either matches `stage-index` exactly or it keeps its
 * place at the end with the raw text on display.
 */

export interface RoundKey {
  stage: number;
  index: number;
}

const ROUND_PATTERN = /^(\d+)-(\d+)$/;

/** `"3-2"` → `{stage:3, index:2}`; anything else → `null` (kept, never guessed). */
export function parseRound(round: string | undefined | null): RoundKey | null {
  const m = ROUND_PATTERN.exec((round ?? "").trim());
  return m ? { stage: Number(m[1]), index: Number(m[2]) } : null;
}

/**
 * Numeric ordering for `stage-index` strings. Assumes `index < 100`, which
 * holds for every real game round ("2-1" … "7-5"); `"10-1"` (1001) still
 * sorts after `"7-5"` (705).
 */
export function compareRounds(a: string | undefined, b: string | undefined): number {
  const ka = parseRound(a);
  const kb = parseRound(b);
  if (ka && kb) return ka.stage - kb.stage || ka.index - kb.index;
  if (ka) return -1; // parseable rounds come first
  if (kb) return 1;
  return 0; // both unparseable: caller keeps insertion order
}
