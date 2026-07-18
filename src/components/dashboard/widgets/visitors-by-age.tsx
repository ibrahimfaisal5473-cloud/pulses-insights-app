"use client";

import { useAgeTimeseries } from "@/hooks/use-visitors";
import { BarChart, ChartLegend } from "@/components/charts/bar-chart";
import { chart } from "@/config/chart";
import { formatNumber, formatShortDate } from "@/lib/utils";
import { AGE_BANDS } from "@/types";
import { WidgetCard } from "../widget-card";

const SERIES = AGE_BANDS.map((band, i) => ({
  key: band,
  name: band === "Unknown" ? band : `Age ${band}`,
  color: chart.ageSeries[i],
}));

/** Daily visitors split by age decade, stacked — /api/v1/visitors/age/timeseries. */
export function VisitorsByAge() {
  const query = useAgeTimeseries();

  return (
    <WidgetCard
      title="Total Daily Visitors by Age"
      description="Daily distribution of unique and repeat visitors by age decade"
      query={query}
    >
      {(data) => (
        <div className="flex flex-col gap-3">
          <ChartLegend
            series={SERIES}
            values={Object.fromEntries(
              AGE_BANDS.map((band) => [band, formatNumber(data.totals[band])]),
            )}
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
