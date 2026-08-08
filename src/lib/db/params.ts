import type { MetricFilters } from "./metrics";

/**
 * Parse and validate query-string filters.
 *
 * Validation happens at the edge of the system, once, so everything deeper can
 * assume clean input. Rejecting a bad `from=banana` here with a 400 is far more
 * useful than letting Postgres throw a type error at query time.
 */

export type ParseResult =
  | { ok: true; filters: MetricFilters }
  | { ok: false; error: string };

const MAX_SESSION_GAP_MINUTES = 24 * 60;

export function parseMetricFilters(sp: URLSearchParams): ParseResult {
  const filters: MetricFilters = {};

  for (const key of ["from", "to"] as const) {
    const raw = sp.get(key);
    if (raw === null) continue;
    const d = new Date(raw);
    if (Number.isNaN(d.getTime())) {
      return { ok: false, error: `${key} is not a valid date` };
    }
    filters[key] = d.toISOString();
  }

  if (filters.from && filters.to && filters.from >= filters.to) {
    return { ok: false, error: "from must be earlier than to" };
  }

  const site = sp.get("site");
  if (site !== null) {
    if (!/^[A-Za-z0-9-]{1,32}$/.test(site)) {
      return { ok: false, error: "site is not a valid location code" };
    }
    filters.site = site.toUpperCase();
  }

  const zone = sp.get("zone");
  if (zone !== null) {
    if (!/^[A-Za-z0-9-]{1,32}$/.test(zone)) {
      return { ok: false, error: "zone is not a valid zone code" };
    }
    filters.zone = zone.toUpperCase();
  }

  const gap = sp.get("sessionGapMinutes");
  if (gap !== null) {
    const n = Number(gap);
    if (!Number.isInteger(n) || n < 1 || n > MAX_SESSION_GAP_MINUTES) {
      return {
        ok: false,
        error: `sessionGapMinutes must be an integer between 1 and ${MAX_SESSION_GAP_MINUTES}`,
      };
    }
    filters.sessionGapMinutes = n;
  }

  return { ok: true, filters };
}
