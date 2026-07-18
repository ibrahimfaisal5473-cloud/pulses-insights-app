import type { ApiErrorBody, VisitorsQuery } from "@/types";

/**
 * Minimal typed fetch wrapper for the /api/v1 endpoints.
 * Throws ApiError with the server's message so hooks/widgets can surface it.
 */

export class ApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

function buildSearch(query?: VisitorsQuery, extra?: Record<string, string>): string {
  const params = new URLSearchParams();
  if (query?.startDate) params.set("startDate", query.startDate);
  if (query?.endDate) params.set("endDate", query.endDate);
  if (query?.zones && query.zones.length > 0) {
    params.set("zones", query.zones.join(","));
  }
  if (query?.genders && query.genders.length > 0) {
    params.set("genders", query.genders.join(","));
  }
  if (query?.ages && query.ages.length > 0) {
    params.set("ages", query.ages.join(","));
  }
  if (query?.granularity) params.set("granularity", query.granularity);
  for (const [k, v] of Object.entries(extra ?? {})) params.set(k, v);
  const qs = params.toString();
  return qs ? `?${qs}` : "";
}

/** `extra` carries endpoint-specific params that aren't part of the shared filters. */
export async function apiGet<T>(
  path: string,
  query?: VisitorsQuery,
  extra?: Record<string, string>,
): Promise<T> {
  const res = await fetch(`${path}${buildSearch(query, extra)}`);

  if (!res.ok) {
    const body = (await res.json().catch(() => null)) as ApiErrorBody | null;
    throw new ApiError(body?.error ?? `Request failed (${res.status})`, res.status);
  }
  return res.json() as Promise<T>;
}
