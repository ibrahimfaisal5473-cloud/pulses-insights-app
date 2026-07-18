import type {
  CommonJourneysResponse,
  DwellByZoneResponse,
  DwellSentimentResponse,
  JourneyFlowResponse,
  JourneyGroupBy,
  JourneyStats,
  JourneyTimeOfDay,
  JourneyVolumeResponse,
  ThresholdTrackerResponse,
  VisitorsQuery,
} from "@/types";
import { apiGet } from "./client";

/** Typed fetchers for the journey endpoints. */

export const fetchJourneyStats = (q?: VisitorsQuery) =>
  apiGet<JourneyStats>("/api/v1/journey/stats", q);

export type JourneyFlowParams = {
  groupBy: JourneyGroupBy;
  timeOfDay: JourneyTimeOfDay;
};

export const fetchJourneyFlow = (q?: VisitorsQuery, params?: JourneyFlowParams) =>
  apiGet<JourneyFlowResponse>("/api/v1/journey/flow", q, {
    groupBy: params?.groupBy ?? "type",
    timeOfDay: params?.timeOfDay ?? "all",
  });

export const fetchCommonJourneys = (q?: VisitorsQuery) =>
  apiGet<CommonJourneysResponse>("/api/v1/journey/common", q);

export const fetchDwellByZone = (q?: VisitorsQuery) =>
  apiGet<DwellByZoneResponse>("/api/v1/journey/dwell", q);

export const fetchJourneyVolume = (q?: VisitorsQuery) =>
  apiGet<JourneyVolumeResponse>("/api/v1/journey/volume", q);

export const fetchDwellSentiment = (q?: VisitorsQuery) =>
  apiGet<DwellSentimentResponse>("/api/v1/journey/dwell-sentiment", q);

export const fetchThresholdTracker = (q?: VisitorsQuery) =>
  apiGet<ThresholdTrackerResponse>("/api/v1/journey/threshold", q);
