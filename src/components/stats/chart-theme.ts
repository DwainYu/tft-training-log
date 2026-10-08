/**
 * Chart tokens — the boundary between the app theme and the charts.
 *
 * Recharts renders colours as SVG presentation attributes, which need literal
 * values (var() does not resolve in attributes), so this module returns the
 * literal palette for the active theme. The values are copies of the `@theme`
 * block in `src/index.css` for the matching theme; when a token changes there
 * it changes here and nowhere else.
 *
 * Chart components should use `CHART_SEMANTIC` (what the colour *means*),
 * not `CHART` (what the colour *is*), and must call this with the theme from
 * `useTheme()` so a toggle re-renders the SVG with the right literals.
 */

export interface ChartTokens {
  CHART: {
    grid: string;
    tick: string;
    axis: string;
    surface: string;
    ink: string;
    gold: string;
    amber: string;
    accent: string;
  };
  CHART_SEMANTIC: {
    series: string;
    reference: string;
    highlight: string;
    negative: string;
  };
  AXIS_TICK: { fill: string; fontSize: 11 };
  AXIS_LINE: { stroke: string };
  TOOLTIP_STYLE: {
    backgroundColor: string;
    border: string;
    borderRadius: number;
    fontSize: number;
    color: string;
  };
  /** Hover highlight behind a bar, as a literal rgba. */
  BAR_CURSOR: string;
}

export function chartTheme(dark: boolean): ChartTokens {
  const CHART = dark
    ? {
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
        /** --color-teal-400 — the one colour that carries meaning (Top4) */
        accent: "#38bdf8",
      }
    : {
        grid: "#e3e7ee",
        tick: "#5f6a80",
        axis: "#dfe3ea",
        surface: "#ffffff",
        ink: "#1b2233",
        gold: "#a87c14",
        amber: "#8f6a10",
        accent: "#0284c7",
      };

  return {
    CHART,
    CHART_SEMANTIC: {
      /** The measured series itself: the trend line, the mistake bars. */
      series: CHART.gold,
      /** A derived reference (window average) — must differ from `series`. */
      reference: CHART.amber,
      /** A game worth looking at: Top4 in the trend, positive outliers elsewhere. */
      highlight: CHART.accent,
      /** Bottom4 / negative. */
      negative: dark ? "#f87171" : "#dc2626",
    },
    AXIS_TICK: { fill: CHART.tick, fontSize: 11 },
    AXIS_LINE: { stroke: CHART.grid },
    TOOLTIP_STYLE: {
      backgroundColor: CHART.surface,
      border: `1px solid ${CHART.axis}`,
      borderRadius: 10,
      fontSize: 12,
      color: CHART.ink,
    },
    BAR_CURSOR: dark ? "rgba(209,154,43,0.08)" : "rgba(168,124,20,0.10)",
  };
}

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
