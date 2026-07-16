"use client";

import { AGE_BANDS } from "@/types";
import { useAgeDistribution, useAgeHappiness } from "@/hooks/use-visitors";
import { DonutChart } from "@/components/charts/donut-chart";
import { chart } from "@/config/chart";
import { formatCompact } from "@/lib/utils";
import { WidgetCard } from "../widget-card";
import { useLens } from "../lens";

/**
 * Age split — lens-aware, mirroring the reference:
 *  · Visits    → counts per age band
 *  · Happiness → sentiment per band, sized by visitor share (greens)
 */
export function AgeDistribution() {
  const { lens } = useLens();
  return lens === "happiness" ? <AgeHappinessCard /> : <AgeVisitsCard />;
}

function AgeVisitsCard() {
  const query = useAgeDistribution();

  return (
    <WidgetCard
      title="Total Visitors by Age"
      description="Unique and repeat visitors by age band"
      query={query}
      contentHeight={192}
    >
      {(data) => {
        const total = AGE_BANDS.reduce((sum, band) => sum + data[band], 0);
        return (
          <DonutChart
            centerValue={formatCompact(total)}
            centerLabel="Visitors"
            data={AGE_BANDS.map((band) => ({ name: band, value: data[band] }))}
          />
        );
      }}
    </WidgetCard>
  );
}

function AgeHappinessCard() {
  const counts = useAgeDistribution();
  const happiness = useAgeHappiness();

  return (
    <WidgetCard
      title="Happiness by Age"
      description="Avg happiness per age band · area = visitor share, colour = sentiment"
      query={happiness}
      contentHeight={192}
    >
      {(scores) => {
        const avg =
          AGE_BANDS.reduce((sum, band) => sum + scores[band], 0) / AGE_BANDS.length;

        return (
          <DonutChart
            colors={chart.happinessSeries}
            centerValue={avg.toFixed(0)}
            centerLabel="Happiness"
            data={AGE_BANDS.map((band) => ({
              name: band,
              // Slice size follows visitor share; even split while counts load.
              value: counts.data?.[band] ?? 1,
              display: scores[band].toFixed(1),
            }))}
          />
        );
      }}
    </WidgetCard>
  );
}
