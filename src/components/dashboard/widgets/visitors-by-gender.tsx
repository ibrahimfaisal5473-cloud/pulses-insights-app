"use client";

import { useGenderTimeseries } from "@/hooks/use-visitors";
import { BarChart, ChartLegend } from "@/components/charts/bar-chart";
import { chart } from "@/config/chart";
import { formatNumber, formatShortDate } from "@/lib/utils";
import { WidgetCard } from "../widget-card";

const SERIES = [
  { key: "male", name: "Male", color: chart.secondary },
  { key: "female", name: "Female", color: chart.primary },
];

/** Daily visitors split by gender, stacked — /api/v1/visitors/gender/timeseries. */
export function VisitorsByGender() {
  const query = useGenderTimeseries();

  return (
    <WidgetCard
      title="Total Daily Visitors by Gender"
      description="Daily distribution of unique and repeat visitors by gender"
      query={query}
    >
      {(data) => (
        <div className="flex flex-col gap-3">
          <ChartLegend
            series={SERIES}
            values={{
              male: formatNumber(data.totals.male),
              female: formatNumber(data.totals.female),
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
