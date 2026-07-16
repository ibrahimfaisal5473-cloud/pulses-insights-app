import type {
  AgeDistribution,
  AgeHappiness,
  GenderDistribution,
  GenderHappiness,
  HappinessTimeseriesResponse,
  HeatmapResponse,
  VisitorCounts,
  VisitorsQuery,
  VisitorsTimeseriesResponse,
  ZonesResponse,
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

export const fetchVisitorsTimeseries = (q?: VisitorsQuery) =>
  apiGet<VisitorsTimeseriesResponse>("/api/v1/visitors/timeseries", q);

export const fetchHappinessTimeseries = (q?: VisitorsQuery) =>
  apiGet<HappinessTimeseriesResponse>("/api/v1/visitors/happiness/timeseries", q);

export const fetchVisitorsHeatmap = (q?: VisitorsQuery) =>
  apiGet<HeatmapResponse>("/api/v1/visitors/heatmap", q);

export const fetchZones = (q?: VisitorsQuery) =>
  apiGet<ZonesResponse>("/api/v1/zones", q);
