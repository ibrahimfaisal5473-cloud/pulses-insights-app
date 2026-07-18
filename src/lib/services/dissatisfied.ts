import {
  AGE_BANDS,
  type AgeBand,
  type DissatisfiedByHourResponse,
  type DissatisfiedDemographicsResponse,
  type DissatisfiedSummary,
  type DissatisfiedVisitor,
  type DissatisfiedVisitorsResponse,
  type RepeatSentimentResponse,
  type UnhappyJourneysResponse,
} from "@/types";
import {
  eachDay,
  hourWeights,
  isoDay,
  cohortDayVisitors,
  resolveZones,
  sample,
  sampleInt,
  samplePick,
} from "@/lib/mock/generator";
import { MOCK_ZONES } from "@/lib/mock/zones";
import type { ParsedVisitorsQuery } from "./params";

/**
 * Dissatisfied-visitor services.
 *
 * Mirrors how the real product surfaces this: anonymous, hashed face tags
 * only — never names, photos, or identities — reviewed like negative survey
 * comments. All figures are deterministic per day.
 */

const round1 = (n: number) => Math.round(n * 10) / 10;

/** The day under review — the end of the selected range. */
function reviewDay(q: ParsedVisitorsQuery): string {
  return isoDay(q.end);
}

/** Total zone entries (visits) on a given day. */
function dayVisits(day: string, q: ParsedVisitorsQuery): number {
  const zones = resolveZones(q.zoneIds);
  return zones.reduce(
    (sum, z) => sum + Math.round(cohortDayVisitors(day, z, q) * z.entriesPerVisitor),
    0,
  );
}

/** How many visitors were dissatisfied on a day (~1–2% of visits). */
function dissatisfiedCount(day: string, q: ParsedVisitorsQuery): number {
  const visits = dayVisits(day, q);
  return Math.max(1, Math.round(visits * sample(`dis:${day}`, 0.008, 0.02)));
}

/** Stable anonymous tag, e.g. "#5F2E7A". */
function faceTag(seed: string): string {
  const hex = Math.floor(sample(`face:${seed}`, 0, 0xffffff))
    .toString(16)
    .toUpperCase()
    .padStart(6, "0");
  return `#${hex}`;
}

export function getDissatisfiedSummary(q: ParsedVisitorsQuery): DissatisfiedSummary {
  const day = reviewDay(q);
  const totalVisits = dayVisits(day, q);
  const count = dissatisfiedCount(day, q);
  return {
    date: day,
    dissatisfiedCount: count,
    totalVisits,
    pct: round1((count / (totalVisits || 1)) * 100),
  };
}

export function getDissatisfiedVisitors(
  q: ParsedVisitorsQuery,
): DissatisfiedVisitorsResponse {
  const day = reviewDay(q);
  const zones = resolveZones(q.zoneIds);
  const count = Math.min(8, dissatisfiedCount(day, q));

  // A filtered view must not list a visitor the filter excludes, so the
  // sampled demographics are drawn from the selection, not the full range.
  const genders = q.genders.length > 0 ? q.genders : ["male", "female"];
  const ageBands = q.ages.length > 0 ? q.ages : AGE_BANDS;

  const visitors: DissatisfiedVisitor[] = Array.from({ length: count }, (_, i) => {
    const seed = `${day}:${i}`;
    const stops = sampleInt(`stops:${seed}`, 2, 3);

    const path = Array.from({ length: stops }, (_, s) => {
      const zone = samplePick(`zone:${seed}:${s}`, zones);
      return {
        zone: zone.name,
        minutes: Math.round(zone.dwellMinutes * sample(`min:${seed}:${s}`, 0.3, 1.8)),
      };
    });

    const hour = sampleInt(`hour:${seed}`, 7, 17);
    const minute = sampleInt(`minute:${seed}`, 0, 59);

    return {
      id: faceTag(seed),
      path,
      totalMinutes: path.reduce((sum, p) => sum + p.minutes, 0),
      time: `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`,
      gender: samplePick(`g:${seed}`, genders) === "male" ? "Male" : "Female",
      ageBand: samplePick(`a:${seed}`, ageBands),
      visits: sampleInt(`v:${seed}`, 1, 3),
      sentiment: Math.round(sample(`s:${seed}`, 62, 75)),
    };
  });

  visitors.sort((a, b) => a.sentiment - b.sentiment);
  return { visitors };
}

export function getUnhappyJourneys(q: ParsedVisitorsQuery): UnhappyJourneysResponse {
  const day = reviewDay(q);

  // The lowest-sentiment zones tend to anchor recurring unhappy paths.
  const worst = [...MOCK_ZONES]
    .sort((a, b) => a.happinessOffset - b.happinessOffset)
    .slice(0, 3);

  const journeys = worst.map((zone, i) => {
    const partner = MOCK_ZONES[(i + 2) % MOCK_ZONES.length];
    return {
      id: `unhappy-${zone.id}`,
      path: [zone.name, partner.name],
      count: sampleInt(`uc:${day}:${i}`, 1, 4),
      avgMinutes: Math.round(
        (zone.dwellMinutes + partner.dwellMinutes) * sample(`um:${day}:${i}`, 0.5, 0.9),
      ),
      sentiment: round1(sample(`us:${day}:${i}`, 64, 74)),
    };
  });

  journeys.sort((a, b) => a.sentiment - b.sentiment);
  return { journeys };
}

export function getDissatisfiedByHour(
  q: ParsedVisitorsQuery,
): DissatisfiedByHourResponse {
  const day = reviewDay(q);
  const total = dissatisfiedCount(day, q);

  const hours = hourWeights(day).map(({ hour, weight }) => ({
    hour,
    count: Math.round(total * weight * sample(`dh:${day}:${hour}`, 0.4, 1.6)),
  }));

  return { hours };
}

export function getDissatisfiedDemographics(
  q: ParsedVisitorsQuery,
): DissatisfiedDemographicsResponse {
  const { visitors } = getDissatisfiedVisitors(q);

  const male = visitors.filter((v) => v.gender === "Male").length;
  const byAge = AGE_BANDS.map((band) => ({
    band: band as AgeBand,
    count: visitors.filter((v) => v.ageBand === band).length,
  })).filter((b) => b.count > 0);

  return {
    byGender: [
      { name: "Male", count: male },
      { name: "Female", count: visitors.length - male },
    ],
    byAge,
  };
}

export function getRepeatSentiment(q: ParsedVisitorsQuery): RepeatSentimentResponse {
  const days = eachDay(q.start, q.end);
  // Sample a handful of days across the range for each repeat visitor.
  const sampleDays = days.filter((_, i) => i % Math.ceil(days.length / 6) === 0).slice(0, 6);

  const visitors = Array.from({ length: 3 }, (_, i) => {
    const seed = `repeat:${i}:${days[0]}`;
    const drift = sample(`drift:${seed}`, -6, 6);

    const points = sampleDays.map((date, d) => ({
      date,
      score: Math.round(
        Math.min(
          96,
          Math.max(
            52,
            74 + drift * (d / Math.max(1, sampleDays.length - 1)) + sample(`p:${seed}:${d}`, -7, 7),
          ),
        ),
      ),
    }));

    const delta = points[points.length - 1].score - points[0].score;
    return {
      id: faceTag(seed),
      points,
      trend: (delta > 5 ? "improving" : delta < -5 ? "worsening" : "stable") as
        | "improving"
        | "worsening"
        | "stable",
    };
  });

  return { visitors };
}
