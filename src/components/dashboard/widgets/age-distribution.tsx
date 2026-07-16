"use client";

import { useAgeDistribution } from "@/hooks/use-visitors";
import { AgeBarChart } from "@/components/charts/age-bar-chart";
import { WidgetCard } from "../widget-card";

/** Age distribution widget — /api/v1/visitors/age. */
export function AgeDistribution() {
  const query = useAgeDistribution();

  return (
    <WidgetCard
      title="Visitors by Age"
      description="Visitor counts per age band"
      query={query}
      contentHeight={240}
    >
      {(data) => <AgeBarChart data={data} />}
    </WidgetCard>
  );
}
