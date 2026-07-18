/**
 * Shared domain & API types — the single source of truth imported by mock
 * data, services, route handlers, the API client, hooks, and components.
 *
 * Response shapes mirror the public Pulses Insights API so a real backend
 * can replace the mock without touching the UI.
 */

/* ---------- Query ---------- */

/** Bucket size for time-series endpoints. */
export const GRANULARITIES = ["hour", "day", "week"] as const;
export type Granularity = (typeof GRANULARITIES)[number];

/** Filters accepted by every visitors endpoint (all optional). */
export type VisitorsQuery = {
  /** ISO date-time, inclusive start of range. */
  startDate?: string;
  /** ISO date-time, inclusive end of range. */
  endDate?: string;
  /** Zone ids to include; empty/omitted = all zones. */
  zones?: string[];
  /** Genders to include; empty/omitted = all. */
  genders?: string[];
  /** Age bands to include; empty/omitted = all. */
  ages?: string[];
  /** Bucket size for time-series responses; omitted = "day". */
  granularity?: Granularity;
};

/* ---------- Zones ---------- */

/** Journey phases, in visit order — every zone belongs to exactly one. */
export const JOURNEY_PHASE_IDS = [
  "arrival",
  "registration",
  "waiting",
  "service",
  "activity",
] as const;

export type JourneyPhaseId = (typeof JOURNEY_PHASE_IDS)[number];

export type Zone = {
  id: string;
  name: string;
  /** Journey phase the zone belongs to — groups zones in the filter panel. */
  phase: JourneyPhaseId;
  totalVisitors: number;
  percentOfTotal: number;
  /** Average happiness index (0–100) for this zone over the range. */
  happiness: number;
  /** Sentiment samples behind `happiness` — the sample size. */
  happinessChecks: number;
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

/** Average happiness index (0–100) per gender. */
export type GenderHappiness = {
  male: number;
  female: number;
};

/** Age decades as reported by the camera age estimate, plus unrecognised faces. */
export const AGE_BANDS = [
  "0s",
  "10s",
  "20s",
  "30s",
  "40s",
  "50s",
  "60s",
  "70s",
  "80s",
  "Unknown",
] as const;

export type AgeBand = (typeof AGE_BANDS)[number];

export type AgeDistribution = Record<AgeBand, number>;

/** Average happiness index (0–100) per age band. */
export type AgeHappiness = Record<AgeBand, number>;

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

export type GenderTimeseriesPoint = {
  time: string;
  male: number;
  female: number;
};

export type GenderTimeseriesResponse = {
  /** Range totals per gender — shown next to the legend. */
  totals: GenderDistribution;
  timeseries: GenderTimeseriesPoint[];
};

/** An ISO day bucket plus one count per age band. */
export type AgeTimeseriesPoint = { time: string } & Record<AgeBand, number>;

export type AgeTimeseriesResponse = {
  totals: AgeDistribution;
  timeseries: AgeTimeseriesPoint[];
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

/** Happiness index (0–100) per day/hour cell. */
export type HappinessHeatmapCell = {
  day: HeatmapDay;
  hour: number;
  score: number;
  /** Cells with too few samples are dimmed in the UI. */
  lowSample: boolean;
};

export type HappinessHeatmapResponse = {
  heatmap: HappinessHeatmapCell[];
};

/* ---------- Waiting time ---------- */

export type WaitingTimePoint = {
  time: string;
  /** Average wait in minutes. */
  minutes: number;
};

export type WaitingTimeResponse = {
  average: number;
  peak: number;
  timeseries: WaitingTimePoint[];
};

/* ---------- Zones over time ---------- */

export type ZoneSeriesPoint = {
  time: string;
  /** Visitor count keyed by zone id. */
  zones: Record<string, number>;
};

export type ZonesTimeseriesResponse = {
  zones: { id: string; name: string }[];
  timeseries: ZoneSeriesPoint[];
};

/** Below this many checks a day's zone happiness is too thin to trust. */
export const LOW_SAMPLE_CHECKS = 25;

export type ZoneHappinessPoint = {
  time: string;
  /** Happiness + sample size keyed by zone id. */
  zones: Record<string, { happiness: number; checks: number }>;
};

export type ZonesHappinessTimeseriesResponse = {
  zones: { id: string; name: string }[];
  timeseries: ZoneHappinessPoint[];
};

/* ---------- Journeys ---------- */

export type JourneyStats = {
  avgZonesPerJourney: number;
  avgDwellMinutes: number;
  /** % of journeys that reach a service or activity zone. */
  reachServicePct: number;
  /** The experience threshold `exceedThresholdPct` is measured against. */
  thresholdMinutes: number;
  /** % of journeys longer than `thresholdMinutes`. */
  exceedThresholdPct: number;
};

/** How the flow diagram groups its columns. */
export const JOURNEY_GROUP_BY = ["type", "zone"] as const;
export type JourneyGroupBy = (typeof JOURNEY_GROUP_BY)[number];

/** Time-of-day slice the flow is measured over. */
export const JOURNEY_TIME_OF_DAY = ["all", "morning", "afternoon", "evening"] as const;
export type JourneyTimeOfDay = (typeof JOURNEY_TIME_OF_DAY)[number];

/** A zone feeding a flow node, split by how its visitors got there. */
export type JourneyNodeContributor = {
  id: string;
  name: string;
  /** Arrived from an earlier column. */
  fromFunnel: number;
  /** Entered the journey at this node. */
  startedHere: number;
};

export type JourneyFlowNode = {
  id: string;
  name: string;
  /** 0-based column the node sits in. */
  column: number;
  visitors: number;
  fromFunnel: number;
  startedHere: number;
  /** Average happiness index (0–100) for the node. */
  happiness: number;
  /** Zones behind the node, largest first. */
  contributors: JourneyNodeContributor[];
};

export type JourneyFlowLink = {
  id: string;
  source: string;
  target: string;
  value: number;
  /** `value` as a share of the source node's visitors. */
  sharePct: number;
  happiness: number;
};

export type JourneyFlowResponse = {
  groupBy: JourneyGroupBy;
  timeOfDay: JourneyTimeOfDay;
  /** Column headers, left to right. */
  columns: string[];
  nodes: JourneyFlowNode[];
  links: JourneyFlowLink[];
  /** Low-volume links dropped to keep the diagram readable. */
  hiddenFlows: number;
  totalVisitors: number;
};

export type CommonJourney = {
  id: string;
  /** Ordered zone names. */
  path: string[];
  sharePct: number;
  visits: number;
  avgMinutes: number;
  /** Average happiness index (0–100) across the path. */
  happiness: number;
};

export type CommonJourneysResponse = {
  journeys: CommonJourney[];
};

export type ZoneDwell = {
  id: string;
  name: string;
  minutes: number;
  /** Average happiness index (0–100) for the zone. */
  happiness: number;
};

export type DwellByZoneResponse = {
  zones: ZoneDwell[];
};

export type JourneyVolumePoint = {
  hour: number;
  transitions: number;
  /** People present in the centre during the hour. */
  occupancy: number;
  /** Average happiness index (0–100) for the hour. */
  happiness: number;
};

export type JourneyVolumeResponse = {
  peakHour: number;
  peakTransitions: number;
  hours: JourneyVolumePoint[];
};

/** Sentiment bucketed by how long the visit lasted. */
export type DwellSentimentBucket = {
  id: string;
  label: string;
  happiness: number;
  visits: number;
};

export type DwellSentimentResponse = {
  buckets: DwellSentimentBucket[];
  /** Bucket id with the lowest happiness — the answer to "does longer hurt?". */
  worstBucketId: string;
};

export type ThresholdPoint = {
  /** ISO day. */
  date: string;
  /** Share of the day's visits that exceeded the threshold. */
  sharePct: number;
  /** Visit count behind `sharePct`. */
  visits: number;
};

export type ThresholdTrackerResponse = {
  /** The experience threshold these visits exceeded, in minutes. */
  thresholdMinutes: number;
  points: ThresholdPoint[];
  /** ISO day with the highest share. */
  peakDate: string;
  averagePct: number;
};

/* ---------- Dissatisfied visitors ---------- */

export type DissatisfiedSummary = {
  /** ISO day the review covers (the end of the range). */
  date: string;
  dissatisfiedCount: number;
  totalVisits: number;
  pct: number;
};

export type DissatisfiedStop = {
  zone: string;
  minutes: number;
};

export type DissatisfiedVisitor = {
  /** Anonymous, hashed face tag — never a real identity. */
  id: string;
  path: DissatisfiedStop[];
  totalMinutes: number;
  time: string;
  gender: "Male" | "Female";
  ageBand: AgeBand;
  visits: number;
  sentiment: number;
};

export type DissatisfiedVisitorsResponse = {
  visitors: DissatisfiedVisitor[];
};

export type UnhappyJourney = {
  id: string;
  path: string[];
  count: number;
  avgMinutes: number;
  sentiment: number;
};

export type UnhappyJourneysResponse = {
  journeys: UnhappyJourney[];
};

export type DissatisfiedByHourResponse = {
  hours: { hour: number; count: number }[];
};

export type DissatisfiedDemographicsResponse = {
  byGender: { name: string; count: number }[];
  byAge: { band: AgeBand; count: number }[];
};

export type RepeatSentimentVisitor = {
  id: string;
  points: { date: string; score: number }[];
  trend: "improving" | "worsening" | "stable";
};

export type RepeatSentimentResponse = {
  visitors: RepeatSentimentVisitor[];
};

/* ---------- Errors ---------- */

export type ApiErrorBody = {
  error: string;
};
