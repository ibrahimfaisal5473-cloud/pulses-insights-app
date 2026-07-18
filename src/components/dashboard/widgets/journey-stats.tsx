"use client";

import { useJourneyStats } from "@/hooks/use-journeys";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { StatLabel, WidgetError } from "./stat-parts";

/** The four headline journey stats — /api/v1/journey/stats. */
export function JourneyStatsRow() {
  const query = useJourneyStats();

  if (query.isPending) {
    return (
      <>
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i}>
            <CardContent className="flex flex-col gap-3">
              <Skeleton className="h-8 w-24" />
              <Skeleton className="h-3 w-32" />
            </CardContent>
          </Card>
        ))}
      </>
    );
  }

  if (query.isError) {
    return (
      <Card className="lg:col-span-4">
        <CardContent>
          <WidgetError query={query} />
        </CardContent>
      </Card>
    );
  }

  const s = query.data;
  return (
    <>
      <Stat value={s.avgZonesPerJourney.toFixed(1)} label="Avg zones / journey" />
      <Stat value={String(s.avgDwellMinutes)} unit="min" label="Avg total dwell" />
      <Stat value={String(s.reachServicePct)} unit="%" label="Reach service or activity" />
      <Stat
        value={String(s.exceedThresholdPct)}
        unit="%"
        label={`Exceed ${s.thresholdMinutes}-min threshold`}
      />
    </>
  );
}

function Stat({
  value,
  unit,
  label,
}: {
  value: string;
  unit?: string;
  label: string;
}) {
  return (
    <Card>
      <CardContent className="flex flex-col gap-2">
        <span className="font-heading text-[32px] font-semibold leading-none tabular-nums text-primary">
          {value}
          {unit && <span className="ml-1 text-base text-muted-foreground">{unit}</span>}
        </span>
        <StatLabel>{label}</StatLabel>
      </CardContent>
    </Card>
  );
}
