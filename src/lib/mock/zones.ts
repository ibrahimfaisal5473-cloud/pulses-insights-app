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
};

export const MOCK_ZONES: MockZone[] = [
  { id: "entrance",     name: "Entrance",      weight: 0.28, entriesPerVisitor: 2.6, happinessOffset: +1.5 },
  { id: "main-hall",    name: "Main Hall",     weight: 0.22, entriesPerVisitor: 2.2, happinessOffset: -1.8 },
  { id: "service-desk", name: "Service Desk",  weight: 0.16, entriesPerVisitor: 2.0, happinessOffset: -0.5 },
  { id: "waiting-area", name: "Waiting Area",  weight: 0.12, entriesPerVisitor: 1.8, happinessOffset: +0.6 },
  { id: "help-desk",    name: "Help Desk",     weight: 0.09, entriesPerVisitor: 1.7, happinessOffset: -3.2 },
  { id: "cafe",         name: "Café",          weight: 0.07, entriesPerVisitor: 1.5, happinessOffset: +3.8 },
  { id: "security",     name: "Security",      weight: 0.06, entriesPerVisitor: 1.4, happinessOffset: -1.0 },
];

export const ZONE_IDS = MOCK_ZONES.map((z) => z.id);

/** Baseline unique visitors per weekday across the whole site. */
export const BASE_DAILY_VISITORS = 290;
