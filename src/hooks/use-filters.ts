"use client";

import { useCallback, useMemo } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { AGE_BANDS, type AgeBand, type Granularity, type VisitorsQuery } from "@/types";

/**
 * Dashboard filters live in the URL, so a filtered view is shareable and
 * bookmarkable, and every data hook can read them without prop drilling.
 *
 * Date, zones, age and gender apply to every view; granularity only changes
 * how time-bucketed widgets are aggregated.
 */

/** Relative date windows. `custom` reads the `from`/`to` params instead. */
export const RANGE_PRESETS = [
  { value: "full", label: "Full period" },
  { value: "today", label: "Today" },
  { value: "yesterday", label: "Yesterday" },
  { value: "7", label: "Last 7 days" },
  { value: "30", label: "Last 30 days" },
  { value: "custom", label: "Custom" },
] as const;

export type RangePreset = (typeof RANGE_PRESETS)[number]["value"];

export const DEFAULT_RANGE: RangePreset = "30";

/** How far back "Full period" reaches — the extent of the retained dataset. */
export const FULL_PERIOD_DAYS = 365;

export const GENDERS = [
  { value: "male", label: "Male" },
  { value: "female", label: "Female" },
] as const;

export type Gender = (typeof GENDERS)[number]["value"];

/** Age bands offered in the picker, in the order they are listed. */
export const AGE_OPTIONS = AGE_BANDS;

export const GRANULARITIES = [
  { value: "hour", label: "Hour" },
  { value: "day", label: "Day" },
  { value: "week", label: "Week" },
] as const;

export const DEFAULT_GRANULARITY: Granularity = "day";

export type Filters = {
  range: RangePreset;
  /** ISO day (yyyy-mm-dd), only meaningful when `range` is "custom". */
  from: string | null;
  to: string | null;
  /** Selected zone ids; empty = all zones. */
  zones: string[];
  /** Selected genders; empty = all. */
  genders: Gender[];
  /** Selected age bands; empty = all. */
  ages: AgeBand[];
  granularity: Granularity;
};

const isRange = (v: string): v is RangePreset =>
  RANGE_PRESETS.some((p) => p.value === v);

const csv = <T extends string>(raw: string | null, allowed: readonly T[]): T[] =>
  raw
    ? raw
        .split(",")
        .map((v) => v.trim())
        .filter((v): v is T => (allowed as readonly string[]).includes(v))
    : [];

/** Reads the current filters from the URL. */
export function useFilters(): Filters {
  const searchParams = useSearchParams();
  const qs = searchParams.toString();

  return useMemo(() => {
    const params = new URLSearchParams(qs);
    const rangeRaw = params.get("range") ?? DEFAULT_RANGE;
    const bucket = params.get("bucket") ?? DEFAULT_GRANULARITY;
    const zonesRaw = params.get("zones");

    return {
      range: isRange(rangeRaw) ? rangeRaw : DEFAULT_RANGE,
      from: params.get("from"),
      to: params.get("to"),
      zones: zonesRaw ? zonesRaw.split(",").filter(Boolean) : [],
      genders: csv(
        params.get("gender"),
        GENDERS.map((g) => g.value),
      ),
      ages: csv(params.get("ages"), AGE_OPTIONS),
      granularity: GRANULARITIES.some((g) => g.value === bucket)
        ? (bucket as Granularity)
        : DEFAULT_GRANULARITY,
    };
  }, [qs]);
}

const startOfDay = (d: Date) => {
  const c = new Date(d);
  c.setHours(0, 0, 0, 0);
  return c;
};

const endOfDay = (d: Date) => {
  const c = new Date(d);
  c.setHours(23, 59, 59, 999);
  return c;
};

const daysAgo = (n: number) => new Date(Date.now() - n * 86400000);

/** Resolves a filter set to the concrete [start, end] window it selects. */
export function resolveRange(filters: Filters): { start: Date; end: Date } {
  const now = new Date();

  switch (filters.range) {
    case "today":
      return { start: startOfDay(now), end: endOfDay(now) };
    case "yesterday": {
      const y = daysAgo(1);
      return { start: startOfDay(y), end: endOfDay(y) };
    }
    case "full":
      return {
        start: startOfDay(daysAgo(FULL_PERIOD_DAYS - 1)),
        end: endOfDay(now),
      };
    case "custom": {
      const from = filters.from ? new Date(`${filters.from}T00:00:00`) : null;
      const to = filters.to ? new Date(`${filters.to}T00:00:00`) : null;
      // An incomplete or inverted custom range falls back to the default window.
      if (from && to && !Number.isNaN(+from) && !Number.isNaN(+to) && from <= to) {
        return { start: startOfDay(from), end: endOfDay(to) };
      }
      return {
        start: startOfDay(daysAgo(Number(DEFAULT_RANGE) - 1)),
        end: endOfDay(now),
      };
    }
    default:
      return {
        start: startOfDay(daysAgo(Number(filters.range) - 1)),
        end: endOfDay(now),
      };
  }
}

/** The filters translated into the API query every hook sends. */
export function useVisitorsQuery(): VisitorsQuery {
  const filters = useFilters();

  return useMemo(() => {
    const { start, end } = resolveRange(filters);
    return {
      startDate: start.toISOString(),
      endDate: end.toISOString(),
      zones: filters.zones,
      genders: filters.genders,
      ages: filters.ages,
      granularity: filters.granularity,
    };
  }, [filters]);
}

/** Writes filters back to the URL (replace, so filtering doesn't spam history). */
export function useSetFilters() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  return useCallback(
    (next: Partial<Filters>) => {
      const params = new URLSearchParams(searchParams.toString());

      /** Omitted params mean "default", so the URL only carries real choices. */
      const set = (key: string, value: string | null, omitWhen: string) => {
        if (!value || value === omitWhen) params.delete(key);
        else params.set(key, value);
      };

      if (next.range !== undefined) set("range", next.range, DEFAULT_RANGE);
      if (next.from !== undefined) set("from", next.from, "");
      if (next.to !== undefined) set("to", next.to, "");
      if (next.zones !== undefined) set("zones", next.zones.join(","), "");
      if (next.genders !== undefined) set("gender", next.genders.join(","), "");
      if (next.ages !== undefined) set("ages", next.ages.join(","), "");
      if (next.granularity !== undefined) {
        set("bucket", next.granularity, DEFAULT_GRANULARITY);
      }

      // A non-custom range has no use for the custom endpoints.
      if (next.range !== undefined && next.range !== "custom") {
        params.delete("from");
        params.delete("to");
      }

      const qs = params.toString();
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    },
    [router, pathname, searchParams],
  );
}

/** True when `filters` differs from the defaults — drives the Reset affordance. */
export function hasActiveFilters(f: Filters): boolean {
  return (
    f.range !== DEFAULT_RANGE ||
    f.zones.length > 0 ||
    f.genders.length > 0 ||
    f.ages.length > 0 ||
    f.granularity !== DEFAULT_GRANULARITY
  );
}
