"use client";

import { useMemo, useState } from "react";
import { CalendarDays, ChevronDown, SlidersHorizontal } from "lucide-react";
import { useZones } from "@/hooks/use-visitors";
import {
  AGE_OPTIONS,
  DEFAULT_GRANULARITY,
  DEFAULT_RANGE,
  type Filters,
  GENDERS,
  GRANULARITIES,
  type Gender,
  RANGE_PRESETS,
  type RangePreset,
  hasActiveFilters,
  resolveRange,
  useFilters,
  useSetFilters,
} from "@/hooks/use-filters";
import type { JourneyPhaseId, Zone } from "@/types";
import { JOURNEY_PHASE_IDS } from "@/types";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

/**
 * Dashboard filters — one popover covering date range, zones, demographics and
 * time granularity. Edits are held as a draft and written to the URL on Apply,
 * so a multi-part filter change refetches the page's widgets once, not per click.
 */

const GENDER_VALUES: Gender[] = GENDERS.map((g) => g.value);

const PHASE_LABELS: Record<JourneyPhaseId, string> = {
  arrival: "Arrival",
  registration: "Registration",
  waiting: "Waiting",
  service: "Service",
  activity: "Activity",
};

const dateFmt = new Intl.DateTimeFormat("en-GB", {
  day: "numeric",
  month: "short",
  year: "numeric",
});

/** "27 Apr – 12 Jun 2026", dropping the year from the start when it repeats. */
function formatRange(start: Date, end: Date): string {
  const endLabel = dateFmt.format(end);
  if (start.toDateString() === end.toDateString()) return endLabel;

  const startLabel =
    start.getFullYear() === end.getFullYear()
      ? dateFmt.format(start).replace(` ${start.getFullYear()}`, "")
      : dateFmt.format(start);

  return `${startLabel} – ${endLabel}`;
}

const toInputDate = (d: Date) => d.toISOString().slice(0, 10);

/**
 * The filter model stores "empty = everything", which keeps URLs short but
 * would render every box unchecked. These translate between the two.
 */
const isPicked = <T extends string>(selected: T[], value: T) =>
  selected.length === 0 || selected.includes(value);

function togglePicked<T extends string>(selected: T[], value: T, all: readonly T[]): T[] {
  const current = selected.length === 0 ? [...all] : selected;
  const next = current.includes(value)
    ? current.filter((v) => v !== value)
    : [...current, value];
  return next.length === all.length ? [] : next;
}

export function FilterBar() {
  const filters = useFilters();
  const setFilters = useSetFilters();
  const zonesQuery = useZones();
  const zones = useMemo(() => zonesQuery.data?.zones ?? [], [zonesQuery.data]);

  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<Filters>(filters);

  /**
   * Opening always starts from what is actually applied, so an abandoned edit
   * never leaks into the next session with the panel.
   */
  const onOpenChange = (next: boolean) => {
    if (next) setDraft(filters);
    setOpen(next);
  };

  const patch = (next: Partial<Filters>) => setDraft((d) => ({ ...d, ...next }));

  const applied = resolveRange(filters);
  const zoneIds = useMemo(() => zones.map((z) => z.id), [zones]);

  const byPhase = useMemo(() => {
    const groups = new Map<JourneyPhaseId, Zone[]>();
    for (const phase of JOURNEY_PHASE_IDS) {
      const inPhase = zones.filter((z) => z.phase === phase);
      if (inPhase.length > 0) groups.set(phase, inPhase);
    }
    return [...groups];
  }, [zones]);

  const selectRange = (value: RangePreset) => {
    if (value !== "custom") {
      patch({ range: value, from: null, to: null });
      return;
    }
    const { start, end } = resolveRange(draft);
    patch({
      range: "custom",
      from: draft.from ?? toInputDate(start),
      to: draft.to ?? toInputDate(end),
    });
  };

  const toggleZone = (id: string) =>
    patch({ zones: togglePicked(draft.zones, id, zoneIds) });

  /** Category header checkbox — selects or clears every zone in the phase. */
  const togglePhase = (phaseZones: Zone[], allOn: boolean) => {
    const current = draft.zones.length === 0 ? [...zoneIds] : draft.zones;
    const ids = phaseZones.map((z) => z.id);
    const next = allOn
      ? current.filter((z) => !ids.includes(z))
      : [...new Set([...current, ...ids])];
    patch({ zones: next.length === zoneIds.length ? [] : next });
  };

  const apply = () => {
    setFilters(draft);
    setOpen(false);
  };

  const reset = () => {
    setFilters({
      range: DEFAULT_RANGE,
      from: null,
      to: null,
      zones: [],
      genders: [],
      ages: [],
      granularity: DEFAULT_GRANULARITY,
    });
    setOpen(false);
  };

  return (
    <Popover open={open} onOpenChange={onOpenChange}>
      <PopoverTrigger
        className={cn(
          "inline-flex items-center gap-3 rounded-full border bg-background px-4 py-2 text-sm transition-colors",
          "hover:bg-muted/60 focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none",
          (open || hasActiveFilters(filters)) && "border-primary/40",
        )}
      >
        <span className="flex items-center gap-2 text-primary">
          <CalendarDays className="h-4 w-4" />
          {formatRange(applied.start, applied.end)}
        </span>

        <span aria-hidden className="h-4 w-px bg-border" />

        <span className="flex items-center gap-2 text-primary">
          <SlidersHorizontal className="h-4 w-4" />
          Filters
        </span>

        <ChevronDown
          className={cn(
            "h-4 w-4 text-muted-foreground transition-transform",
            open && "rotate-180",
          )}
        />
      </PopoverTrigger>

      <PopoverContent align="end" className="w-[min(46rem,calc(100vw-2rem))]">
        {/* Each column scrolls on its own, so a long zone list never pushes
            granularity out of reach. */}
        <div className="grid grid-cols-1 items-start sm:grid-cols-[1.35fr_1fr]">
          {/* Left column — date range and zones */}
          <div className="flex max-h-[70vh] flex-col gap-5 overflow-y-auto p-5 sm:border-r">
            <div className="flex flex-wrap gap-2">
              {RANGE_PRESETS.map((preset) => (
                <button
                  key={preset.value}
                  type="button"
                  aria-pressed={draft.range === preset.value}
                  onClick={() => selectRange(preset.value)}
                  className={cn(
                    "rounded-full border px-4 py-1.5 text-sm transition-colors",
                    draft.range === preset.value
                      ? "border-primary bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:bg-muted",
                  )}
                >
                  {preset.label}
                </button>
              ))}
            </div>

            {draft.range === "custom" && (
              <div className="flex flex-wrap items-center gap-2">
                <input
                  type="date"
                  aria-label="Start date"
                  value={draft.from ?? ""}
                  max={draft.to ?? undefined}
                  onChange={(e) => patch({ from: e.target.value || null })}
                  className="rounded-lg border bg-background px-3 py-1.5 text-sm"
                />
                <span className="text-muted-foreground">–</span>
                <input
                  type="date"
                  aria-label="End date"
                  value={draft.to ?? ""}
                  min={draft.from ?? undefined}
                  max={toInputDate(new Date())}
                  onChange={(e) => patch({ to: e.target.value || null })}
                  className="rounded-lg border bg-background px-3 py-1.5 text-sm"
                />
              </div>
            )}

            <div className="flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <h3 className="text-xs tracking-[0.14em] text-muted-foreground uppercase">
                  Zones &amp; categories
                </h3>
                <button
                  type="button"
                  onClick={() =>
                    patch({ zones: draft.zones.length === 0 ? zoneIds : [] })
                  }
                  className="text-xs font-medium tracking-wide text-primary uppercase hover:underline"
                >
                  {draft.zones.length === 0 ? "None" : "All"}
                </button>
              </div>

              {zonesQuery.isPending && (
                <p className="text-sm text-muted-foreground">Loading zones…</p>
              )}

              {byPhase.map(([phase, phaseZones]) => {
                const picked = phaseZones.filter((z) => isPicked(draft.zones, z.id));
                const allOn = picked.length === phaseZones.length;

                return (
                  <div key={phase} className="flex flex-col gap-2">
                    <label className="flex items-center gap-2.5 text-sm font-medium">
                      <Checkbox
                        checked={allOn}
                        aria-label={`All ${PHASE_LABELS[phase]} zones`}
                        indeterminate={picked.length > 0 && !allOn}
                        onCheckedChange={() => togglePhase(phaseZones, allOn)}
                      />
                      {PHASE_LABELS[phase]}
                    </label>

                    <div className="flex flex-col gap-2 pl-6">
                      {phaseZones.map((zone) => (
                        <label
                          key={zone.id}
                          className="flex items-center gap-2.5 text-sm text-muted-foreground"
                        >
                          <Checkbox
                            checked={isPicked(draft.zones, zone.id)}
                            aria-label={zone.name}
                            onCheckedChange={() => toggleZone(zone.id)}
                          />
                          {zone.name}
                        </label>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Right column — demographics and granularity */}
          <div className="flex max-h-[70vh] flex-col gap-5 overflow-y-auto p-5">
            <div className="flex flex-col gap-2">
              {GENDERS.map((gender) => (
                <label key={gender.value} className="flex items-center gap-2.5 text-sm">
                  <Checkbox
                    checked={isPicked(draft.genders, gender.value)}
                    aria-label={gender.label}
                    onCheckedChange={() =>
                      patch({
                        genders: togglePicked(draft.genders, gender.value, GENDER_VALUES),
                      })
                    }
                  />
                  {gender.label}
                </label>
              ))}
            </div>

            <div className="flex flex-col gap-2">
              <h3 className="text-xs tracking-[0.14em] text-muted-foreground uppercase">
                Age group
              </h3>
              {AGE_OPTIONS.map((band) => (
                <label key={band} className="flex items-center gap-2.5 text-sm">
                  <Checkbox
                    checked={isPicked(draft.ages, band)}
                    aria-label={`Age ${band}`}
                    onCheckedChange={() =>
                      patch({
                        ages: togglePicked(draft.ages, band, AGE_OPTIONS),
                      })
                    }
                  />
                  {band}
                </label>
              ))}
            </div>

            <div className="flex flex-col gap-2">
              <h3 className="text-xs tracking-[0.14em] text-muted-foreground uppercase">
                Time granularity
              </h3>
              <div className="inline-flex self-start rounded-full border bg-muted/50 p-1">
                {GRANULARITIES.map((g) => (
                  <button
                    key={g.value}
                    type="button"
                    aria-pressed={draft.granularity === g.value}
                    onClick={() => patch({ granularity: g.value })}
                    className={cn(
                      "rounded-full px-5 py-1.5 text-sm transition-colors",
                      draft.granularity === g.value
                        ? "bg-background font-medium shadow-sm"
                        : "text-muted-foreground hover:text-foreground",
                    )}
                  >
                    {g.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 border-t px-5 py-3">
          <p className="text-xs text-muted-foreground">
            Date, zones, age &amp; gender apply to every view.
          </p>
          <div className="flex items-center gap-2">
            <Button variant="ghost" onClick={reset}>
              Reset
            </Button>
            <Button onClick={apply}>Apply</Button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
