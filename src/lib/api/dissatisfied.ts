import type {
  DissatisfiedByHourResponse,
  DissatisfiedDemographicsResponse,
  DissatisfiedSummary,
  DissatisfiedVisitorsResponse,
  RepeatSentimentResponse,
  UnhappyJourneysResponse,
  VisitorsQuery,
} from "@/types";
import { apiGet } from "./client";

/** Typed fetchers for the dissatisfied-visitor endpoints. */

export const fetchDissatisfiedSummary = (q?: VisitorsQuery) =>
  apiGet<DissatisfiedSummary>("/api/v1/dissatisfied/summary", q);

export const fetchDissatisfiedVisitors = (q?: VisitorsQuery) =>
  apiGet<DissatisfiedVisitorsResponse>("/api/v1/dissatisfied/visitors", q);

export const fetchUnhappyJourneys = (q?: VisitorsQuery) =>
  apiGet<UnhappyJourneysResponse>("/api/v1/dissatisfied/journeys", q);

export const fetchDissatisfiedByHour = (q?: VisitorsQuery) =>
  apiGet<DissatisfiedByHourResponse>("/api/v1/dissatisfied/by-hour", q);

export const fetchDissatisfiedDemographics = (q?: VisitorsQuery) =>
  apiGet<DissatisfiedDemographicsResponse>("/api/v1/dissatisfied/demographics", q);

export const fetchRepeatSentiment = (q?: VisitorsQuery) =>
  apiGet<RepeatSentimentResponse>("/api/v1/dissatisfied/repeat-sentiment", q);
