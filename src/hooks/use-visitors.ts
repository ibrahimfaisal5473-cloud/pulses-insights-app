"use client";

import type { VisitorsQuery } from "@/types";
import {
  fetchAgeDistribution,
  fetchAgeHappiness,
  fetchAgeTimeseries,
  fetchGenderDistribution,
  fetchGenderHappiness,
  fetchGenderTimeseries,
  fetchHappinessHeatmap,
  fetchHappinessTimeseries,
  fetchVisitorCounts,
  fetchVisitorsHeatmap,
  fetchVisitorsTimeseries,
  fetchWaitingTime,
  fetchZones,
  fetchZonesHappinessTimeseries,
  fetchZonesTimeseries,
} from "@/lib/api/visitors";
import { useApiQuery } from "./use-api-query";

/**
 * One hook per widget/endpoint. Each defaults to the dashboard filters in the
 * URL, so a filter change refetches every widget.
 */

export const useVisitorCounts = (q?: VisitorsQuery) =>
  useApiQuery("visitor-counts", fetchVisitorCounts, q);

export const useGenderDistribution = (q?: VisitorsQuery) =>
  useApiQuery("gender-distribution", fetchGenderDistribution, q);

export const useGenderHappiness = (q?: VisitorsQuery) =>
  useApiQuery("gender-happiness", fetchGenderHappiness, q);

export const useAgeDistribution = (q?: VisitorsQuery) =>
  useApiQuery("age-distribution", fetchAgeDistribution, q);

export const useAgeHappiness = (q?: VisitorsQuery) =>
  useApiQuery("age-happiness", fetchAgeHappiness, q);

export const useGenderTimeseries = (q?: VisitorsQuery) =>
  useApiQuery("gender-timeseries", fetchGenderTimeseries, q);

export const useAgeTimeseries = (q?: VisitorsQuery) =>
  useApiQuery("age-timeseries", fetchAgeTimeseries, q);

export const useVisitorsTimeseries = (q?: VisitorsQuery) =>
  useApiQuery("visitors-timeseries", fetchVisitorsTimeseries, q);

export const useHappinessTimeseries = (q?: VisitorsQuery) =>
  useApiQuery("happiness-timeseries", fetchHappinessTimeseries, q);

export const useVisitorsHeatmap = (q?: VisitorsQuery) =>
  useApiQuery("visitors-heatmap", fetchVisitorsHeatmap, q);

export const useHappinessHeatmap = (q?: VisitorsQuery) =>
  useApiQuery("happiness-heatmap", fetchHappinessHeatmap, q);

export const useWaitingTime = (q?: VisitorsQuery) =>
  useApiQuery("waiting-time", fetchWaitingTime, q);

export const useZones = (q?: VisitorsQuery) => useApiQuery("zones", fetchZones, q);

export const useZonesTimeseries = (q?: VisitorsQuery) =>
  useApiQuery("zones-timeseries", fetchZonesTimeseries, q);

export const useZonesHappinessTimeseries = (q?: VisitorsQuery) =>
  useApiQuery("zones-happiness-timeseries", fetchZonesHappinessTimeseries, q);
