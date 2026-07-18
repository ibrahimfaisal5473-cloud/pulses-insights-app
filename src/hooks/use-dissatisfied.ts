"use client";

import type { VisitorsQuery } from "@/types";
import {
  fetchDissatisfiedByHour,
  fetchDissatisfiedDemographics,
  fetchDissatisfiedSummary,
  fetchDissatisfiedVisitors,
  fetchRepeatSentiment,
  fetchUnhappyJourneys,
} from "@/lib/api/dissatisfied";
import { useApiQuery } from "./use-api-query";

/** One hook per dissatisfied-visitor widget/endpoint. */

export const useDissatisfiedSummary = (q?: VisitorsQuery) =>
  useApiQuery("dissatisfied-summary", fetchDissatisfiedSummary, q);

export const useDissatisfiedVisitors = (q?: VisitorsQuery) =>
  useApiQuery("dissatisfied-visitors", fetchDissatisfiedVisitors, q);

export const useUnhappyJourneys = (q?: VisitorsQuery) =>
  useApiQuery("unhappy-journeys", fetchUnhappyJourneys, q);

export const useDissatisfiedByHour = (q?: VisitorsQuery) =>
  useApiQuery("dissatisfied-by-hour", fetchDissatisfiedByHour, q);

export const useDissatisfiedDemographics = (q?: VisitorsQuery) =>
  useApiQuery("dissatisfied-demographics", fetchDissatisfiedDemographics, q);

export const useRepeatSentiment = (q?: VisitorsQuery) =>
  useApiQuery("repeat-sentiment", fetchRepeatSentiment, q);
