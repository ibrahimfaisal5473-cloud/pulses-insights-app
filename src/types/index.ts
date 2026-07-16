/**
 * Shared domain & API types — the single source of truth imported by mock
 * data, services, route handlers, the API client, hooks, and components.
 *
 * Response shapes mirror the public Pulses Insights API so a real backend
 * can replace the mock without touching the UI.
 */

/* ---------- Query ---------- */

/** Filters accepted by every visitors endpoint (all optional). */
export type VisitorsQuery = {
  /** ISO date-time, inclusive start of range. */
  startDate?: string;
  /** ISO date-time, inclusive end of range. */
  endDate?: string;
  /** Zone ids to include; empty/omitted = all zones. */
  zones?: string[];
};

/* ---------- Zones ---------- */

export type Zone = {
  id: string;
  name: string;
  totalVisitors: number;
  percentOfTotal: number;
};

export type ZonesResponse = {
  zones: Zone[];
};

/* ---------- Visitors ---------- */

export type VisitorCounts = {
  totalVisitors: number;
  newVisitors: number;
  repeatedVisitors: number;
  /** Not unique — every zone entry counts (footfall). */
  totalHeadcount: number;
};

export type GenderDistribution = {
  male: number;
  female: number;
};

export const AGE_BANDS = [
  "0-14",
  "15-24",
  "25-34",
  "35-44",
  "45-54",
  "55+",
] as const;

export type AgeBand = (typeof AGE_BANDS)[number];

export type AgeDistribution = Record<AgeBand, number>;

/* ---------- Time series ---------- */

export type VisitorsTimeseriesPoint = {
  /** ISO date-time bucket. */
  time: string;
  total: number;
  new: number;
  repeated: number;
};

export type VisitorsTimeseriesResponse = {
  timeseries: VisitorsTimeseriesPoint[];
};

export type HappinessPoint = {
  time: string;
  /** Happiness index 0–100. */
  value: number;
};

export type HappinessTimeseriesResponse = {
  /** Latest value in the range. */
  score: number;
  average: number;
  peak: number;
  lowest: number;
  timeseries: HappinessPoint[];
};

/* ---------- Heatmap ---------- */

export const HEATMAP_DAYS = [
  "Mon",
  "Tue",
  "Wed",
  "Thu",
  "Fri",
  "Sat",
  "Sun",
] as const;

export type HeatmapDay = (typeof HEATMAP_DAYS)[number];

export type HeatmapCell = {
  day: HeatmapDay;
  /** Hour of day, 0–23. */
  hour: number;
  count: number;
};

export type HeatmapResponse = {
  heatmap: HeatmapCell[];
};

/* ---------- Errors ---------- */

export type ApiErrorBody = {
  error: string;
};
