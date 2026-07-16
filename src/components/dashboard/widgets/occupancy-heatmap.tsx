"use client";

import { useVisitorsHeatmap } from "@/hooks/use-visitors";
import { HeatmapGrid } from "@/components/charts/heatmap-grid";
import { WidgetCard } from "../widget-card";

/** Occupancy heatmap widget — /api/v1/visitors/heatmap. */
export function OccupancyHeatmap() {
  const query = useVisitorsHeatmap();

  return (
    <WidgetCard
      title="Occupancy by Day & Hour"
      description="When the site is busiest — visitor volume per weekday and hour"
      query={query}
      contentHeight={252}
    >
      {(data) => <HeatmapGrid data={data.heatmap} />}
    </WidgetCard>
  );
}
