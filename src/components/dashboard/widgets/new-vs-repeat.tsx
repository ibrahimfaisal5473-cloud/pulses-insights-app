"use client";

import { useVisitorsTimeseries } from "@/hooks/use-visitors";
import { BarChart, ChartLegend } from "@/components/charts/bar-chart";
import { chart } from "@/config/chart";
import { formatNumber, formatShortDate } from "@/lib/utils";
import { WidgetCard } from "../widget-card";

const SERIES = [
  { key: "new", name: "New Visitors", color: chart.primary },
  { key: "repeated", name: "Repeated Visitors", color: chart.secondary },
];

/** New vs repeat visitors, stacked — /api/v1/visitors/timeseries. */
export function NewVsRepeat() {
  const query = useVisitorsTimeseries();

  return (
    <WidgetCard
      title="Total New and Repeat Visitors"
      description="Daily breakdown of first-time versus returning visitors"
      query={query}
    >
      {(data) => (
        <div className="flex flex-col gap-3">
          <ChartLegend
            series={SERIES}
            values={{
              new: formatNumber(data.timeseries.reduce((s, p) => s + p.new, 0)),
              repeated: formatNumber(
                data.timeseries.reduce((s, p) => s + p.repeated, 0),
              ),
            }}
          />
          <BarChart
            data={data.timeseries}
            xKey="time"
            xTickFormatter={formatShortDate}
            valueFormatter={formatNumber}
            series={SERIES}
            stacked
            brush
          />
        </div>
      )}
    </WidgetCard>
  );
}
