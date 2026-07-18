"use client";

import { useDissatisfiedByHour } from "@/hooks/use-dissatisfied";
import { RankedBars } from "@/components/charts/ranked-bars";
import { chart } from "@/config/chart";
import { WidgetCard } from "../widget-card";

/** When dissatisfaction happens — /api/v1/dissatisfied/by-hour. */
export function DissatisfiedByHour() {
  const query = useDissatisfiedByHour();

  return (
    <WidgetCard
      title="When Dissatisfaction Happens"
      description="Dissatisfied visitors by hour of day"
      query={query}
      contentHeight={220}
    >
      {(data) => {
        const rows = data.hours.filter((h) => h.count > 0);
        if (rows.length === 0) {
          return (
            <p className="py-8 text-center text-sm text-muted-foreground">
              No dissatisfied visits recorded on this day.
            </p>
          );
        }
        return (
          <RankedBars
            labelWidth="72px"
            rows={rows.map((h) => ({
              id: String(h.hour),
              label: `${String(h.hour).padStart(2, "0")}:00`,
              value: h.count,
              display: String(h.count),
              color: chart.primary,
            }))}
          />
        );
      }}
    </WidgetCard>
  );
}
