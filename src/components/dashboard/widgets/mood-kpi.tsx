"use client";

import { Smile } from "lucide-react";
import { useHappinessTimeseries } from "@/hooks/use-visitors";
import { KpiCard, KpiCardError, KpiCardSkeleton } from "../kpi-card";

/** Visitor mood KPI driven independently by /api/v1/visitors/happiness/timeseries. */
export function MoodKpi() {
  const query = useHappinessTimeseries();

  if (query.isPending) return <KpiCardSkeleton />;
  if (query.isError) {
    return (
      <KpiCardError
        label="Visitor Mood"
        message={query.error instanceof Error ? query.error.message : "Failed to load"}
      />
    );
  }

  const { score, average, peak, lowest } = query.data;
  return (
    <KpiCard
      label="Visitor Mood"
      value={`${Math.round(score)}/100`}
      sub={`avg ${Math.round(average)} · peak ${Math.round(peak)} · low ${Math.round(lowest)}`}
      icon={Smile}
    />
  );
}
