/**
 * Shared chart palette — Emirates red first, then gold/olive for secondary
 * series, and olive-green reserved for happiness/sentiment (matching the
 * Emirates Insights convention where sentiment reads green).
 * Keeping colors here means every widget stays visually consistent.
 */
export const chart = {
  /** Primary series (Emirates red). */
  primary: "#D71921",
  /** Secondary series (Emirates gold). */
  secondary: "#C8A24C",
  /** Sentiment / happiness series (olive-green). */
  happiness: "#6E8B3D",
  /** Muted comparison series. */
  muted: "#A79E92",
  /** Categorical palette for donuts / multi-series. */
  series: ["#D71921", "#C8A24C", "#8A8B4E", "#9B1B22", "#6E8B3D", "#7E8CA0"],
  /** One colour per age decade — needs more steps than `series` provides. */
  ageSeries: [
    "#2F4B5C",
    "#D71921",
    "#C8A24C",
    "#9B1B22",
    "#8A8B4E",
    "#6E8B3D",
    "#7E8CA0",
    "#E0B76A",
    "#3F3A36",
    "#A79E92",
  ],
  /** Green scale for the Happiness lens (area = share, colour = sentiment). */
  happinessSeries: [
    "#4E7A2E",
    "#6E8B3D",
    "#8AA556",
    "#A3BE70",
    "#5B7431",
    "#94AF63",
    "#3E6524",
    "#7C9847",
    "#B5CD85",
    "#688340",
  ],
} as const;

/**
 * Recharts takes these as inline style/prop objects. Defining them once at
 * module scope keeps every chart's tooltip and axes identical, and gives
 * recharts a stable reference across renders instead of a fresh object on
 * each one — which matters most while a tooltip is tracking the cursor.
 */
export const tooltipStyle = {
  background: "var(--popover)",
  border: "1px solid var(--border)",
  borderRadius: 10,
  color: "var(--popover-foreground)",
  fontSize: 12,
} as const;

/** Shared axis tick style (11px, muted). */
export const axisTick = {
  fontSize: 11,
  fill: "var(--muted-foreground)",
} as const;
