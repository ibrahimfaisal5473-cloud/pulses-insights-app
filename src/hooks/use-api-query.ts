"use client";

import { useQuery } from "@tanstack/react-query";
import type { VisitorsQuery } from "@/types";
import { useVisitorsQuery } from "./use-filters";

/**
 * Shared wiring for every widget hook.
 *
 * Defaults the request to the dashboard filters from the URL, and keys the
 * cache on them — so changing a filter refetches every widget automatically,
 * without any widget needing to know filters exist. Callers can still pass an
 * explicit query to override.
 *
 * `params` carries endpoint-specific options (e.g. the flow diagram's grouping)
 * that aren't shared filters; they're keyed on too, so they refetch the same way.
 */
export function useApiQuery<T, P = undefined>(
  key: string,
  fetcher: (q: VisitorsQuery, params: P) => Promise<T>,
  override?: VisitorsQuery,
  params?: P,
) {
  const filters = useVisitorsQuery();
  const query = override ?? filters;

  return useQuery({
    queryKey: [key, query, params ?? null],
    queryFn: () => fetcher(query, params as P),
  });
}
