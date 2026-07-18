import { AGE_BANDS, type AgeBand, GRANULARITIES, type Granularity } from "@/types";

/**
 * Shared query-string parsing for the /api/v1 endpoints.
 * Defaults to the last 30 days when no range is supplied.
 */

const GENDERS = ["male", "female"];

/** Splits a csv param and rejects any value outside `allowed`. */
function parseCsv<T extends string>(
  raw: string | null,
  allowed: readonly T[],
  label: string,
): { ok: true; values: T[] } | { ok: false; error: string } {
  if (!raw) return { ok: true, values: [] };

  const values = raw.split(",").map((v) => v.trim()).filter(Boolean);
  const bad = values.find((v) => !(allowed as readonly string[]).includes(v));
  if (bad) {
    return { ok: false, error: `${label} contains an unknown value: ${bad}` };
  }
  return { ok: true, values: values as T[] };
}

export type ParsedVisitorsQuery = {
  start: Date;
  end: Date;
  zoneIds: string[];
  /** Empty = all genders. */
  genders: string[];
  /** Empty = all age bands. */
  ages: AgeBand[];
  granularity: Granularity;
};

export type ParseResult =
  | { ok: true; query: ParsedVisitorsQuery }
  | { ok: false; error: string };

const MAX_RANGE_DAYS = 400;

export function parseVisitorsQuery(searchParams: URLSearchParams): ParseResult {
  const startRaw = searchParams.get("startDate");
  const endRaw = searchParams.get("endDate");

  const end = endRaw ? new Date(endRaw) : new Date();
  if (Number.isNaN(end.getTime())) {
    return { ok: false, error: "endDate is not a valid ISO 8601 date" };
  }

  const start = startRaw
    ? new Date(startRaw)
    : new Date(end.getTime() - 29 * 86400000);
  if (Number.isNaN(start.getTime())) {
    return { ok: false, error: "startDate is not a valid ISO 8601 date" };
  }

  if (start.getTime() > end.getTime()) {
    return { ok: false, error: "startDate must be before endDate" };
  }
  if (end.getTime() - start.getTime() > MAX_RANGE_DAYS * 86400000) {
    return { ok: false, error: `Date range cannot exceed ${MAX_RANGE_DAYS} days` };
  }

  const zonesRaw = searchParams.get("zones");
  const zoneIds = zonesRaw
    ? zonesRaw.split(",").map((z) => z.trim()).filter(Boolean)
    : [];

  const genders = parseCsv(searchParams.get("genders"), GENDERS, "genders");
  if (!genders.ok) return genders;

  const ages = parseCsv(searchParams.get("ages"), AGE_BANDS, "ages");
  if (!ages.ok) return ages;

  const granularityRaw = searchParams.get("granularity") ?? "day";
  if (!(GRANULARITIES as readonly string[]).includes(granularityRaw)) {
    return {
      ok: false,
      error: `granularity must be one of: ${GRANULARITIES.join(", ")}`,
    };
  }

  return {
    ok: true,
    query: {
      start,
      end,
      zoneIds,
      genders: genders.values,
      ages: ages.values,
      granularity: granularityRaw as Granularity,
    },
  };
}
