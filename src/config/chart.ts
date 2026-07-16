/**
 * Shared chart palette — Pulses brand teal first, then complementary hues
 * for categorical series. Keeping colors here (not in chart components)
 * means every widget stays visually consistent.
 */
export const chart = {
  /** Primary series (brand teal). */
  primary: "#0F766E",
  /** Secondary series (lighter teal). */
  secondary: "#5EB8AE",
  /** Muted comparison series. */
  muted: "#94A3B8",
  /** Categorical palette for donuts / multi-series. */
  series: ["#0F766E", "#4C8AB1", "#C9A24B", "#8A6BC2", "#5EB8AE", "#B4657B"],
} as const;
