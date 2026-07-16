"use client";

import { useGenderDistribution, useGenderHappiness } from "@/hooks/use-visitors";
import { DonutChart } from "@/components/charts/donut-chart";
import { chart } from "@/config/chart";
import { formatCompact } from "@/lib/utils";
import { WidgetCard } from "../widget-card";
import { useLens } from "../lens";

/**
 * Gender split — lens-aware, mirroring the reference:
 *  · Visits    → counts per gender (red/gold)
 *  · Happiness → sentiment per gender, sized by visitor share (greens)
 */
export function GenderDistribution() {
  const { lens } = useLens();
  return lens === "happiness" ? <GenderHappinessCard /> : <GenderVisitsCard />;
}

function GenderVisitsCard() {
  const query = useGenderDistribution();

  return (
    <WidgetCard
      title="Total Visitors by Gender"
      description="Share of male vs female among unique and repeat visitors"
      query={query}
      contentHeight={192}
    >
      {(data) => (
        <DonutChart
          centerValue={formatCompact(data.male + data.female)}
          centerLabel="Visitors"
          data={[
            { name: "Male", value: data.male },
            { name: "Female", value: data.female },
          ]}
        />
      )}
    </WidgetCard>
  );
}

function GenderHappinessCard() {
  const counts = useGenderDistribution();
  const happiness = useGenderHappiness();

  return (
    <WidgetCard
      title="Happiness by Gender"
      description="Avg happiness per gender · area = visitor share, colour = sentiment"
      query={happiness}
      contentHeight={192}
    >
      {(scores) => {
        // Slice size follows visitor share; fall back to an even split while
        // the counts request is still in flight.
        const male = counts.data?.male ?? 1;
        const female = counts.data?.female ?? 1;
        const avg = (scores.male + scores.female) / 2;

        return (
          <DonutChart
            colors={chart.happinessSeries}
            centerValue={avg.toFixed(0)}
            centerLabel="Happiness"
            data={[
              { name: "Male", value: male, display: scores.male.toFixed(1) },
              { name: "Female", value: female, display: scores.female.toFixed(1) },
            ]}
          />
        );
      }}
    </WidgetCard>
  );
}
