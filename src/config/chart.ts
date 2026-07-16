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
  /** Green scale for the Happiness lens (area = share, colour = sentiment). */
  happinessSeries: [
    "#4E7A2E",
    "#6E8B3D",
    "#8AA556",
    "#A3BE70",
    "#5B7431",
    "#94AF63",
  ],
} as const;
