"use client";

import { useGenderDistribution } from "@/hooks/use-visitors";
import { DonutChart } from "@/components/charts/donut-chart";
import { WidgetCard } from "../widget-card";

/** Gender distribution widget — /api/v1/visitors/gender. */
export function GenderDistribution() {
  const query = useGenderDistribution();

  return (
    <WidgetCard
      title="Visitors by Gender"
      description="Share of visitors by gender across the range"
      query={query}
      contentHeight={192}
    >
      {(data) => (
        <DonutChart
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
