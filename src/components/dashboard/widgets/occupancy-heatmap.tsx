"use client";

import { useVisitorsHeatmap } from "@/hooks/use-visitors";
import { HeatmapGrid } from "@/components/charts/heatmap-grid";
import { formatNumber } from "@/lib/utils";
import { WidgetCard } from "../widget-card";

/** Visitor volume by day × hour — /api/v1/visitors/heatmap. */
export function OccupancyHeatmap() {
  const query = useVisitorsHeatmap();

  return (
    <WidgetCard
      title="Total Visitors Heatmap"
      description="Peak hourly distribution of visitors by day and hour of the week"
      query={query}
      contentHeight={252}
    >
      {(data) => {
        const max = Math.max(...data.heatmap.map((c) => c.count), 1);
        return (
          <HeatmapGrid
            scale="red"
            legend={["Quiet", "Busy"]}
            ariaLabel="Visitor volume by day of week and hour of day"
            cells={data.heatmap.map((c) => ({
              day: c.day,
              hour: c.hour,
              intensity: c.count / max,
              label: `${c.day} ${String(c.hour).padStart(2, "0")}:00 — ${formatNumber(c.count)} visitors`,
            }))}
          />
        );
      }}
    </WidgetCard>
  );
}
