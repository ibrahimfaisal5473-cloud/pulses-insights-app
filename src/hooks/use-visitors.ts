"use client";

import { useQuery } from "@tanstack/react-query";
import type { VisitorsQuery } from "@/types";
import {
  fetchAgeDistribution,
  fetchGenderDistribution,
  fetchHappinessTimeseries,
  fetchVisitorCounts,
  fetchVisitorsHeatmap,
  fetchVisitorsTimeseries,
  fetchZones,
} from "@/lib/api/visitors";

/**
 * TanStack Query hooks — one per widget/endpoint, keyed by the filter query
 * so a future filter change automatically refetches every widget.
 */

export function useVisitorCounts(q?: VisitorsQuery) {
  return useQuery({
    queryKey: ["visitor-counts", q ?? null],
    queryFn: () => fetchVisitorCounts(q),
  });
}

export function useGenderDistribution(q?: VisitorsQuery) {
  return useQuery({
    queryKey: ["gender-distribution", q ?? null],
    queryFn: () => fetchGenderDistribution(q),
  });
}

export function useAgeDistribution(q?: VisitorsQuery) {
  return useQuery({
    queryKey: ["age-distribution", q ?? null],
    queryFn: () => fetchAgeDistribution(q),
  });
}

export function useVisitorsTimeseries(q?: VisitorsQuery) {
  return useQuery({
    queryKey: ["visitors-timeseries", q ?? null],
    queryFn: () => fetchVisitorsTimeseries(q),
  });
}

export function useHappinessTimeseries(q?: VisitorsQuery) {
  return useQuery({
    queryKey: ["happiness-timeseries", q ?? null],
    queryFn: () => fetchHappinessTimeseries(q),
  });
}

export function useVisitorsHeatmap(q?: VisitorsQuery) {
  return useQuery({
    queryKey: ["visitors-heatmap", q ?? null],
    queryFn: () => fetchVisitorsHeatmap(q),
  });
}

export function useZones(q?: VisitorsQuery) {
  return useQuery({
    queryKey: ["zones", q ?? null],
    queryFn: () => fetchZones(q),
  });
}
