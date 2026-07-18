"use client";

import type { VisitorsQuery } from "@/types";
import {
  fetchCommonJourneys,
  fetchDwellByZone,
  fetchDwellSentiment,
  fetchJourneyFlow,
  fetchJourneyStats,
  fetchJourneyVolume,
  fetchThresholdTracker,
  type JourneyFlowParams,
} from "@/lib/api/journeys";
import { useApiQuery } from "./use-api-query";

/** One hook per journey widget/endpoint. */

export const useJourneyStats = (q?: VisitorsQuery) =>
  useApiQuery("journey-stats", fetchJourneyStats, q);

export const useJourneyFlow = (params: JourneyFlowParams, q?: VisitorsQuery) =>
  useApiQuery("journey-flow", fetchJourneyFlow, q, params);

export const useCommonJourneys = (q?: VisitorsQuery) =>
  useApiQuery("common-journeys", fetchCommonJourneys, q);

export const useDwellByZone = (q?: VisitorsQuery) =>
  useApiQuery("dwell-by-zone", fetchDwellByZone, q);

export const useJourneyVolume = (q?: VisitorsQuery) =>
  useApiQuery("journey-volume", fetchJourneyVolume, q);

export const useDwellSentiment = (q?: VisitorsQuery) =>
  useApiQuery("dwell-sentiment", fetchDwellSentiment, q);

export const useThresholdTracker = (q?: VisitorsQuery) =>
  useApiQuery("threshold-tracker", fetchThresholdTracker, q);
