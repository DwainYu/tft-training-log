/**
 * Chart tokens — the single boundary between the app theme and the charts.
 *
 * Recharts renders colours as SVG presentation attributes, which need literal
 * values, so these are copies of the `@theme` block in `src/index.css`. The
 * token name is kept next to every value: when a token changes in `index.css`
 * it changes here and nowhere else.
 *
 * Chart components should use `CHART_SEMANTIC` (what the colour *means*),
 * not `CHART` (what the colour *is*).
 */

export const CHART = {
  /** --color-base-700 */
  grid: "#1e2635",
  /** --color-ink-400 */
  tick: "#8b97ab",
  /** --color-line */
  axis: "#232c3d",
  /** --color-base-850 */
  surface: "#10151f",
  /** --color-ink-50 */
  ink: "#f2f5fa",
  /** --color-gold-400 */
  gold: "#e8b64a",
  /** --color-gold-500 */
  amber: "#d19a2b",
  /** --color-teal-400 — the one colour that actually carries meaning (Top4) */
  accent: "#38bdf8",
} as const;

/** Top4 highlight (blue) vs. the rest. Recharts reads these, not Tailwind. */
export const CHART_SEMANTIC = {
  /** The measured series itself: the trend line, the mistake bars. */
  series: CHART.gold,
  /** A derived reference (window average) — must differ from `series`. */
  reference: CHART.amber,
  /** A game worth looking at: Top4 in the trend, positive outliers elsewhere. */
  highlight: CHART.accent,
  /** Bottom4 / negative. Tailwind red-400; the app defines no token for it. */
  negative: "#f87171",
} as const;

export const AXIS_TICK = { fill: CHART.tick, fontSize: 11 } as const;
export const AXIS_LINE = { stroke: CHART.grid } as const;

export const TOOLTIP_STYLE = {
  backgroundColor: CHART.surface,
  border: `1px solid ${CHART.axis}`,
  borderRadius: 10,
  fontSize: 12,
  color: CHART.ink,
} as const;

/**
 * Minimum sample sizes. Below these numbers a chart cannot answer its own
 * question, so it must say so instead of drawing a shape:
 *
 * - `trend`: 3 points are noise, 1 point draws a zero-length path.
 * - `mistake`: one unreviewed game renders a single 100% "未分类" bar.
 * - `compositionRow`: 1–2 games can only produce 0% / 50% / 100% Top4 rates.
 */
export const MIN_SAMPLES = {
  trend: 5,
  mistake: 5,
  compositionRow: 3,
  /** Below 3 games a route can only ever show 0% / 50% / 100% Top4. */
  openingRow: 3,
  decisionRow: 3,
  augmentRow: 3,
  numericRow: 3,
  /** A newest-vs-previous comparison needs both windows full. */
  mistakeComparison: 20,
} as const;
