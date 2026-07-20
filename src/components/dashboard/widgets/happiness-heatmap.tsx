"use client";

import { useMemo } from "react";
import type { HappinessHeatmapResponse } from "@/types";
import { useHappinessHeatmap } from "@/hooks/use-visitors";
import { HeatmapGrid } from "@/components/charts/heatmap-grid";
import { WidgetCard } from "../widget-card";

/** Happiness by day × hour — /api/v1/visitors/happiness/heatmap. */
export function HappinessHeatmap() {
  const query = useHappinessHeatmap();

  return (
    <WidgetCard
      title="Happiness Heatmap"
      description="Same grid · green = happy, red = unhappy · low-sample cells dimmed"
      query={query}
      contentHeight={252}
    >
      {(data) => <Grid data={data} />}
    </WidgetCard>
  );
}

/** See the note in occupancy-heatmap — the mapping is memoised on the data. */
function Grid({ data }: { data: HappinessHeatmapResponse }) {
  const cells = useMemo(() => {
    const scores = data.heatmap.map((c) => c.score);
    const min = Math.min(...scores);
    const max = Math.max(...scores);
    const span = max - min || 1;

    return data.heatmap.map((c) => ({
      day: c.day,
      hour: c.hour,
      // Relative to the observed range so variation is visible.
      intensity: (c.score - min) / span,
      muted: c.lowSample,
      label: `${c.day} ${String(c.hour).padStart(2, "0")}:00 — ${c.score.toFixed(1)}/100${
        c.lowSample ? " (low sample)" : ""
      }`,
    }));
  }, [data.heatmap]);

  return (
    <HeatmapGrid
      scale="green"
      legend={UNHAPPY_HAPPY}
      ariaLabel="Happiness index by day of week and hour of day"
      cells={cells}
    />
  );
}

/** Hoisted so the tuple identity is stable across renders. */
const UNHAPPY_HAPPY: [string, string] = ["Unhappy", "Happy"];
