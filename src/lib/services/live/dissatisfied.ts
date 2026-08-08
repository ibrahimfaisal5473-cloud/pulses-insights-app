import "server-only";
import { query, queryOne } from "@/lib/db/client";
import { AGE_BANDS } from "@/types";
import type {
  AgeBand,
  DissatisfiedByHourResponse,
  DissatisfiedDemographicsResponse,
  DissatisfiedSummary,
  DissatisfiedVisitorsResponse,
  RepeatSentimentResponse,
  UnhappyJourneysResponse,
} from "@/types";
import type { ParsedVisitorsQuery } from "../params";
import { num, scopeParams } from "./scope";
import { STOPS } from "./stops";

/**
 * Dissatisfied-visitor triage from real pulses.
 *
 * A visit counts as dissatisfied when its sentiment falls below this threshold.
 * It is a product decision, not a fact — it decides how many people appear on
 * this page — so it lives in one named place rather than being scattered
 * through the queries.
 *
 * IT MUST TRACK THE SENTIMENT BASELINE. "Dissatisfied" means below par for this
 * venue, not below some absolute constant, so the number only makes sense
 * relative to where the happiness index normally sits. With the index averaging
 * ~75, a threshold of 60 catches visits that went materially worse than a
 * normal one — typically journeys that spent real time at the help desk or
 * waiting.
 *
 * Set it too far below the baseline and this page silently empties out, which
 * looks like a working feature with nothing to report rather than a
 * misconfiguration. If the sentiment model is ever recalibrated, revisit this
 * number in the same change.
 */
const DISSATISFIED_BELOW = 60;

/**
 * Minimum sentiment readings before a visit can be judged.
 *
 * This matters more than it looks. Zone sentiment averages ~75, so a visit with
 * many readings converges on that average and cannot fall under the threshold —
 * only SHORT visits have enough variance to dip below it. Set this too low and
 * the page fills with statistical noise instead of real cases: at 3 readings a
 * visit scores in coarse steps (two neutrals and a sad is exactly 33.3), and
 * those artefacts outrank genuine friction.
 *
 * At 8, the quantised three-reading cases drop out while a real problem visit —
 * ten minutes at the help desk is roughly nine readings — still qualifies.
 */
const MIN_CHECKS = 8;

const UNHAPPY_VISITS = `
  SELECT v.*, (v.started_at AT TIME ZONE v.site_tz)::date AS local_day
  FROM visits v
  WHERE v.checks >= ${MIN_CHECKS} AND v.happiness < ${DISSATISFIED_BELOW}
`;

/**
 * Headline count for the most recent day in the range.
 *
 * Deliberately scoped to one day: this page is a triage queue, and "who needs
 * attention" is a question about now, not about the whole quarter.
 */
export async function getDissatisfiedSummary(
  q: ParsedVisitorsQuery,
): Promise<DissatisfiedSummary> {
  const row = await queryOne<Record<string, string>>(
    `${STOPS},
     dated AS (
       SELECT v.*, (v.started_at AT TIME ZONE v.site_tz)::date AS local_day FROM visits v
     ),
     latest AS (SELECT max(local_day) AS day FROM dated)
     -- Formatted in SQL: node-postgres hands date columns back as JS Date
     -- objects, and stringifying one yields "Thu Aug 06 2026 ...", not an ISO
     -- day. Letting Postgres format it removes the ambiguity entirely.
     SELECT (SELECT to_char(day, 'YYYY-MM-DD') FROM latest) AS day,
            count(*) FILTER (WHERE checks >= ${MIN_CHECKS} AND happiness < ${DISSATISFIED_BELOW}) AS unhappy,
            count(*) AS total
     FROM dated WHERE local_day = (SELECT day FROM latest)`,
    scopeParams(q),
  );

  const dissatisfiedCount = num(row?.unhappy);
  const totalVisits = num(row?.total);

  return {
    date: row?.day ?? "",
    dissatisfiedCount,
    totalVisits,
    pct: totalVisits ? +((100 * dissatisfiedCount) / totalVisits).toFixed(1) : 0,
  };
}

/**
 * The individual visits needing attention, with the path each person walked.
 *
 * The face id is hashed into a short opaque tag before it leaves the server.
 * A face id is a biometric identifier, and nothing on this screen needs the
 * real one — the operator needs to know a pattern exists, not who it was.
 */
export async function getDissatisfiedVisitors(
  q: ParsedVisitorsQuery,
): Promise<DissatisfiedVisitorsResponse> {
  const rows = await query<Record<string, string>>(
    // `person` already exists inside SCOPE — it resolves each face to one
    // gender and one age. Reused rather than redefined, both to avoid a
    // duplicate CTE name and so demographic resolution lives in one place.
    `${STOPS},
     unhappy AS (${UNHAPPY_VISITS}),
     visit_counts AS (
       SELECT face_id, count(*) AS visit_count FROM visits GROUP BY face_id
     ),
     -- Scoped to the SAME day the summary reports on.
     --
     -- This list is the triage queue, and its caption says "for the day under
     -- review", so it has to agree with the callout above it. Left unscoped it
     -- returned every flagged visit in the range — the header said 6 while the
     -- table listed 40, which reads as a broken page.
     --
     -- The charts beside it stay range-scoped on purpose: they describe
     -- patterns, and a pattern needs more than one day of volume to be real.
     latest_day AS (
       SELECT max((started_at AT TIME ZONE site_tz)::date) AS day FROM visits
     )
     -- DISTINCT ON gives ONE row per person: their unhappiest visit.
     --
     -- Without it a visitor with three bad visits appears three times under the
     -- same anonymous tag, which duplicates React keys and, more importantly,
     -- reads wrong — this is a follow-up queue of PEOPLE, so each should be
     -- listed once at their worst.
     SELECT DISTINCT ON (u.face_id)
            upper(substr(md5(u.face_id), 1, 6)) AS tag,
            -- Local wall-clock time, which is what the table column shows.
            to_char(u.started_at AT TIME ZONE u.site_tz, 'HH24:MI') AS started_time,
            round(u.total_minutes::numeric, 1) AS total_minutes,
            round(u.happiness::numeric, 1)     AS sentiment,
            p.gender, p.age, vc.visit_count,
            (SELECT json_agg(json_build_object('zone', s.zone_name,
                                               'minutes', round(s.dwell_minutes::numeric, 1))
                             ORDER BY s.stop_no)
             FROM stops s
             WHERE s.face_id = u.face_id AND s.visit_no = u.visit_no) AS path
     FROM unhappy u
     JOIN person       p  USING (face_id)
     JOIN visit_counts vc USING (face_id)
     WHERE u.local_day = (SELECT day FROM latest_day)
     -- DISTINCT ON keeps the FIRST row per face_id, so face_id must lead the
     -- ORDER BY; happiness next picks their worst visit as that survivor.
     ORDER BY u.face_id, u.happiness ASC, u.total_minutes DESC`,
    scopeParams(q),
  );

  // DISTINCT ON dictated the SQL sort order (face_id first), so the display
  // order — unhappiest first — is restored here, then trimmed to a screenful.
  return {
    visitors: rows
      .map((r) => ({
        id: r.tag,
        path: (r.path as unknown as { zone: string; minutes: number }[]) ?? [],
        totalMinutes: num(r.total_minutes),
        time: r.started_time,
        gender: (r.gender === "female" ? "Female" : "Male") as "Male" | "Female",
        ageBand: bandOf(r.age),
        visits: num(r.visit_count),
        sentiment: num(r.sentiment),
      }))
      .sort((a, b) => a.sentiment - b.sentiment || b.totalMinutes - a.totalMinutes)
      .slice(0, 40),
  };
}

/** Which paths keep producing unhappy visits. */
export async function getUnhappyJourneys(
  q: ParsedVisitorsQuery,
): Promise<UnhappyJourneysResponse> {
  const rows = await query<Record<string, string>>(
    `${STOPS},
     unhappy AS (${UNHAPPY_VISITS}),
     paths AS (
       SELECT u.face_id, u.visit_no, u.total_minutes, u.happiness,
              array_agg(s.zone_name ORDER BY s.stop_no) AS path
       FROM unhappy u JOIN stops s USING (face_id, visit_no)
       GROUP BY u.face_id, u.visit_no, u.total_minutes, u.happiness
     )
     SELECT path, count(*) AS count,
            round(avg(total_minutes)::numeric, 1) AS avg_minutes,
            round(avg(happiness)::numeric, 1)     AS sentiment
     FROM paths GROUP BY path ORDER BY count DESC LIMIT 10`,
    scopeParams(q),
  );

  return {
    journeys: rows.map((r, i) => ({
      id: `unhappy-${i + 1}`,
      path: r.path as unknown as string[],
      count: num(r.count),
      avgMinutes: num(r.avg_minutes),
      sentiment: num(r.sentiment),
    })),
  };
}

/** When during the day dissatisfaction clusters. */
export async function getDissatisfiedByHour(
  q: ParsedVisitorsQuery,
): Promise<DissatisfiedByHourResponse> {
  const rows = await query<Record<string, string>>(
    `${STOPS},
     unhappy AS (${UNHAPPY_VISITS})
     SELECT g.hour, count(u.face_id) AS count
     FROM generate_series(0, 23) AS g(hour)
     LEFT JOIN unhappy u
       ON EXTRACT(hour FROM u.started_at AT TIME ZONE u.site_tz)::int = g.hour
     GROUP BY g.hour ORDER BY g.hour`,
    scopeParams(q),
  );

  return { hours: rows.map((r) => ({ hour: num(r.hour), count: num(r.count) })) };
}

/** Who the dissatisfied visitors are. */
export async function getDissatisfiedDemographics(
  q: ParsedVisitorsQuery,
): Promise<DissatisfiedDemographicsResponse> {
  const rows = await query<Record<string, string>>(
    // Reuses SCOPE's `person` CTE for the same reason as above.
    `${STOPS},
     unhappy AS (${UNHAPPY_VISITS})
     SELECT p.gender, p.age, count(*) AS count
     FROM unhappy u JOIN person p USING (face_id)
     GROUP BY p.gender, p.age`,
    scopeParams(q),
  );

  const byGenderMap = new Map<string, number>();
  const byBandMap = new Map<string, number>();

  for (const r of rows) {
    const count = num(r.count);
    const gender = r.gender === "female" ? "Female" : "Male";
    byGenderMap.set(gender, (byGenderMap.get(gender) ?? 0) + count);
    const band = bandOf(r.age);
    byBandMap.set(band, (byBandMap.get(band) ?? 0) + count);
  }

  return {
    byGender: [...byGenderMap.entries()].map(([name, count]) => ({ name, count })),
    byAge: AGE_BANDS.map((band) => ({
      band: band as AgeBand,
      count: byBandMap.get(band) ?? 0,
    })),
  };
}

/**
 * Repeat visitors whose sentiment is moving, day by day.
 *
 * Trend compares the first and last readings: an operator wants to know whether
 * a returning visitor is being won back or lost, and a small change either way
 * is noise, so movement under five points reads as stable.
 */
export async function getRepeatSentiment(
  q: ParsedVisitorsQuery,
): Promise<RepeatSentimentResponse> {
  const rows = await query<Record<string, string>>(
    `${STOPS},
     daily AS (
       SELECT face_id,
              to_char((started_at AT TIME ZONE site_tz)::date, 'YYYY-MM-DD') AS day,
              sum(happiness * checks) / NULLIF(sum(checks), 0) AS score,
              sum(checks) AS checks
       FROM visits GROUP BY face_id, (started_at AT TIME ZONE site_tz)::date
     ),
     repeat_faces AS (
       SELECT face_id FROM daily
       GROUP BY face_id HAVING count(*) >= 3 AND sum(checks) >= ${MIN_CHECKS * 3}
     ),
     ranked AS (
       SELECT d.face_id, d.day, round(d.score::numeric, 1) AS score,
              min(d.score) OVER (PARTITION BY d.face_id) AS worst
       FROM daily d JOIN repeat_faces r USING (face_id)
     )
     SELECT face_id, day, score
     FROM ranked
     WHERE face_id IN (
       SELECT face_id FROM ranked GROUP BY face_id ORDER BY min(worst) ASC LIMIT 8
     )
     ORDER BY face_id, day`,
    scopeParams(q),
  );

  const byFace = new Map<string, { date: string; score: number }[]>();
  for (const r of rows) {
    const list = byFace.get(r.face_id) ?? [];
    list.push({ date: r.day, score: num(r.score) });
    byFace.set(r.face_id, list);
  }

  return {
    visitors: [...byFace.entries()].map(([face, points]) => {
      const delta = points[points.length - 1].score - points[0].score;
      return {
        id: hashTag(face),
        points,
        trend: delta > 5 ? "improving" : delta < -5 ? "worsening" : "stable",
      };
    }),
  };
}

/** Short opaque tag — face ids are biometric and never leave the server. */
function hashTag(faceId: string): string {
  let h = 2166136261;
  for (let i = 0; i < faceId.length; i++) {
    h ^= faceId.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0).toString(16).toUpperCase().padStart(6, "0").slice(0, 6);
}

function bandOf(age: string | number | null): AgeBand {
  if (age === null || age === undefined || age === "") return "Unknown";
  const n = Number(age);
  if (!Number.isFinite(n)) return "Unknown";
  const band = `${Math.floor(n / 10) * 10}s`;
  return (AGE_BANDS as readonly string[]).includes(band) ? (band as AgeBand) : "Unknown";
}
