"use client";

import { useVisitorsTimeseries } from "@/hooks/use-visitors";
import { BarChart } from "@/components/charts/bar-chart";
import { chart } from "@/config/chart";
import { formatNumber, formatShortDate } from "@/lib/utils";
import { WidgetCard } from "../widget-card";

/** Total daily visitors — /api/v1/visitors/timeseries. */
export function DailyVisitors() {
  const query = useVisitorsTimeseries();
  const total = query.data?.timeseries.reduce((sum, p) => sum + p.total, 0);

  return (
    <WidgetCard
      title="Total Daily Number of Visitors"
      description="Daily count of unique and repeat visitors"
      query={query}
      stat={total === undefined ? "" : formatNumber(total)}
    >
      {(data) => (
        <BarChart
          data={data.timeseries}
          xKey="time"
          xTickFormatter={formatShortDate}
          valueFormatter={formatNumber}
          series={[{ key: "total", name: "Visitors", color: chart.primary }]}
          brush
        />
      )}
    </WidgetCard>
  );
}
