"use client";

import { useMemo } from "react";
import type { HeatmapResponse } from "@/types";
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
      {(data) => <Grid data={data} />}
    </WidgetCard>
  );
}

/**
 * Split out from the render prop so the cell mapping can be memoised on the
 * query data — a hook can't live inside the callback, and rebuilding the
 * array on every render would defeat HeatmapGrid's own memoisation.
 */
function Grid({ data }: { data: HeatmapResponse }) {
  const cells = useMemo(() => {
    const max = Math.max(...data.heatmap.map((c) => c.count), 1);
    return data.heatmap.map((c) => ({
      day: c.day,
      hour: c.hour,
      intensity: c.count / max,
      label: `${c.day} ${String(c.hour).padStart(2, "0")}:00 — ${formatNumber(c.count)} visitors`,
    }));
  }, [data.heatmap]);

  return (
    <HeatmapGrid
      scale="red"
      legend={QUIET_BUSY}
      ariaLabel="Visitor volume by day of week and hour of day"
      cells={cells}
    />
  );
}

/** Hoisted so the tuple identity is stable across renders. */
const QUIET_BUSY: [string, string] = ["Quiet", "Busy"];
