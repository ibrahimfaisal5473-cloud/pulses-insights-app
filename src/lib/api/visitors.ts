import type {
  AgeDistribution,
  AgeHappiness,
  AgeTimeseriesResponse,
  GenderDistribution,
  GenderHappiness,
  GenderTimeseriesResponse,
  HappinessHeatmapResponse,
  HappinessTimeseriesResponse,
  HeatmapResponse,
  VisitorCounts,
  VisitorsQuery,
  VisitorsTimeseriesResponse,
  WaitingTimeResponse,
  ZonesHappinessTimeseriesResponse,
  ZonesResponse,
  ZonesTimeseriesResponse,
} from "@/types";
import { apiGet } from "./client";

/** Typed fetchers — one per endpoint, matching the mock backend routes. */

export const fetchVisitorCounts = (q?: VisitorsQuery) =>
  apiGet<VisitorCounts>("/api/v1/visitors/counts", q);

export const fetchGenderDistribution = (q?: VisitorsQuery) =>
  apiGet<GenderDistribution>("/api/v1/visitors/gender", q);

export const fetchGenderHappiness = (q?: VisitorsQuery) =>
  apiGet<GenderHappiness>("/api/v1/visitors/gender/happiness", q);

export const fetchAgeDistribution = (q?: VisitorsQuery) =>
  apiGet<AgeDistribution>("/api/v1/visitors/age", q);

export const fetchAgeHappiness = (q?: VisitorsQuery) =>
  apiGet<AgeHappiness>("/api/v1/visitors/age/happiness", q);

export const fetchGenderTimeseries = (q?: VisitorsQuery) =>
  apiGet<GenderTimeseriesResponse>("/api/v1/visitors/gender/timeseries", q);

export const fetchAgeTimeseries = (q?: VisitorsQuery) =>
  apiGet<AgeTimeseriesResponse>("/api/v1/visitors/age/timeseries", q);

export const fetchVisitorsTimeseries = (q?: VisitorsQuery) =>
  apiGet<VisitorsTimeseriesResponse>("/api/v1/visitors/timeseries", q);

export const fetchHappinessTimeseries = (q?: VisitorsQuery) =>
  apiGet<HappinessTimeseriesResponse>("/api/v1/visitors/happiness/timeseries", q);

export const fetchVisitorsHeatmap = (q?: VisitorsQuery) =>
  apiGet<HeatmapResponse>("/api/v1/visitors/heatmap", q);

export const fetchHappinessHeatmap = (q?: VisitorsQuery) =>
  apiGet<HappinessHeatmapResponse>("/api/v1/visitors/happiness/heatmap", q);

export const fetchWaitingTime = (q?: VisitorsQuery) =>
  apiGet<WaitingTimeResponse>("/api/v1/visitors/waiting-time", q);

export const fetchZones = (q?: VisitorsQuery) =>
  apiGet<ZonesResponse>("/api/v1/zones", q);

export const fetchZonesTimeseries = (q?: VisitorsQuery) =>
  apiGet<ZonesTimeseriesResponse>("/api/v1/zones/timeseries", q);

export const fetchZonesHappinessTimeseries = (q?: VisitorsQuery) =>
  apiGet<ZonesHappinessTimeseriesResponse>("/api/v1/zones/happiness/timeseries", q);
