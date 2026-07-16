"use client";

import { useHappinessTimeseries } from "@/hooks/use-visitors";
import { HappinessTrendChart } from "@/components/charts/happiness-trend-chart";
import { WidgetCard } from "../widget-card";

/** Happiness trend widget — /api/v1/visitors/happiness/timeseries. */
export function HappinessTrend() {
  const query = useHappinessTimeseries();

  return (
    <WidgetCard
      title="Visitor Happiness Over Time"
      description="Happiness index (0–100) over the last 30 days"
      query={query}
    >
      {(data) => (
        <div className="flex flex-col gap-3">
          <HappinessTrendChart data={data.timeseries} />
          <div className="flex justify-between border-t pt-3">
            <Stat label="Average" value={data.average} />
            <Stat label="Peak" value={data.peak} />
            <Stat label="Lowest" value={data.lowest} />
          </div>
        </div>
      )}
    </WidgetCard>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex items-baseline gap-2">
      <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
        {label}
      </span>
      <span className="font-heading text-xl font-semibold tabular-nums">
        {Math.round(value)}
      </span>
    </div>
  );
}
