import type { JourneyPhaseId } from "@/types";

/**
 * Seed configuration for the mock deployment — one entry per physical zone.
 * Weights control how traffic, dwell, and sentiment are distributed by the
 * generator; they are static so every request sees the same "site".
 */
export type MockZone = {
  id: string;
  name: string;
  /** Share of total unique visitors that pass through this zone (sums ~1). */
  weight: number;
  /** Average zone entries per visitor who enters it (drives footfall). */
  entriesPerVisitor: number;
  /** Offset applied to the site-wide happiness baseline. */
  happinessOffset: number;
  /** Typical minutes a visitor spends in this zone. */
  dwellMinutes: number;
  /** Where the zone sits in a typical visit. */
  phase: JourneyPhaseId;
};

export const MOCK_ZONES: MockZone[] = [
  { id: "entrance",     name: "Entrance",     weight: 0.28, entriesPerVisitor: 2.6, happinessOffset: +1.5, dwellMinutes: 22, phase: "arrival" },
  { id: "main-hall",    name: "Main Hall",    weight: 0.22, entriesPerVisitor: 2.2, happinessOffset: -1.8, dwellMinutes: 28, phase: "activity" },
  { id: "service-desk", name: "Service Desk", weight: 0.16, entriesPerVisitor: 2.0, happinessOffset: -0.5, dwellMinutes: 44, phase: "service" },
  { id: "waiting-area", name: "Waiting Area", weight: 0.12, entriesPerVisitor: 1.8, happinessOffset: +0.6, dwellMinutes: 51, phase: "waiting" },
  { id: "help-desk",    name: "Help Desk",    weight: 0.09, entriesPerVisitor: 1.7, happinessOffset: -3.2, dwellMinutes: 62, phase: "service" },
  { id: "cafe",         name: "Café",         weight: 0.07, entriesPerVisitor: 1.5, happinessOffset: +3.8, dwellMinutes: 33, phase: "activity" },
  { id: "security",     name: "Security",     weight: 0.06, entriesPerVisitor: 1.4, happinessOffset: -1.0, dwellMinutes: 14, phase: "registration" },
];

export const ZONE_IDS = MOCK_ZONES.map((z) => z.id);

/** Baseline unique visitors per weekday across the whole site. */
export const BASE_DAILY_VISITORS = 290;

/**
 * Visit length (minutes) past which the experience is considered degraded.
 * Both the journey stat card and the threshold tracker read this, so the page
 * can never quote two different thresholds.
 */
export const EXPERIENCE_THRESHOLD_MINUTES = 30;

/**
 * Journey phases, in visit order — drives the flow diagram. Ids match
 * `MockZone.phase`, so every phase resolves to the zones that make it up.
 */
export const JOURNEY_PHASES = [
  { id: "arrival", name: "Arrival" },
  { id: "registration", name: "Registration" },
  { id: "waiting", name: "Waiting" },
  { id: "service", name: "Service" },
  { id: "activity", name: "Activity" },
] as const;
