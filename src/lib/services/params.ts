/**
 * Shared query-string parsing for the /api/v1 endpoints.
 * Defaults to the last 30 days when no range is supplied.
 */

export type ParsedVisitorsQuery = {
  start: Date;
  end: Date;
  zoneIds: string[];
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

  return { ok: true, query: { start, end, zoneIds } };
}
