"use client";

import { useWaitingTime } from "@/hooks/use-visitors";
import { BarChart } from "@/components/charts/bar-chart";
import { chart } from "@/config/chart";
import { formatShortDate } from "@/lib/utils";
import { WidgetCard } from "../widget-card";

/** Average waiting time per day — /api/v1/visitors/waiting-time. */
export function WaitingTime() {
  const query = useWaitingTime();

  return (
    <WidgetCard
      title="Avg Waiting Time"
      description="Average time visitors spend waiting, per day"
      query={query}
    >
      {(data) => (
        <div className="flex flex-col gap-3">
          <BarChart
            data={data.timeseries}
            xKey="time"
            xTickFormatter={formatShortDate}
            valueFormatter={(v) => `${v.toFixed(1)} min`}
            series={[{ key: "minutes", name: "Waiting time", color: chart.series[3] }]}
            brush
          />
          <div className="flex gap-6 border-t pt-3">
            <Stat label="Average" value={`${data.average.toFixed(1)} min`} />
            <Stat label="Peak" value={`${data.peak.toFixed(1)} min`} />
          </div>
        </div>
      )}
    </WidgetCard>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline gap-2">
      <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
        {label}
      </span>
      <span className="font-heading text-lg font-semibold tabular-nums">{value}</span>
    </div>
  );
}
