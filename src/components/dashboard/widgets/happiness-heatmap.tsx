"use client";

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
      {(data) => {
        const scores = data.heatmap.map((c) => c.score);
        const min = Math.min(...scores);
        const max = Math.max(...scores);
        const span = max - min || 1;

        return (
          <HeatmapGrid
            scale="green"
            legend={["Unhappy", "Happy"]}
            ariaLabel="Happiness index by day of week and hour of day"
            cells={data.heatmap.map((c) => ({
              day: c.day,
              hour: c.hour,
              // Relative to the observed range so variation is visible.
              intensity: (c.score - min) / span,
              muted: c.lowSample,
              label: `${c.day} ${String(c.hour).padStart(2, "0")}:00 — ${c.score.toFixed(1)}/100${
                c.lowSample ? " (low sample)" : ""
              }`,
            }))}
          />
        );
      }}
    </WidgetCard>
  );
}
