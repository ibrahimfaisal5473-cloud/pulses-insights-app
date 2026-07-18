"use client";

import { LOW_SAMPLE_CHECKS } from "@/types";
import { useZonesHappinessTimeseries, useZonesTimeseries } from "@/hooks/use-visitors";
import { BarChart, ChartLegend } from "@/components/charts/bar-chart";
import {
  MatrixHeatmap,
  type MatrixCell,
  type MatrixColumn,
} from "@/components/charts/matrix-heatmap";
import { chart } from "@/config/chart";
import { sentimentColor } from "@/lib/sentiment";
import { formatCompact, formatNumber, formatShortDate } from "@/lib/utils";
import { WidgetCard } from "../widget-card";
import { useLens } from "../lens";

/**
 * Zones over time — lens-aware:
 *  · Visits    → stacked daily footfall per zone (/api/v1/zones/timeseries)
 *  · Happiness → daily happiness index per zone
 *                (/api/v1/zones/happiness/timeseries)
 */
export function ZonesOverTime() {
  const { lens } = useLens();
  return lens === "happiness" ? <HappinessOverTime /> : <VisitsOverTime />;
}

function VisitsOverTime() {
  const query = useZonesTimeseries();

  return (
    <WidgetCard
      title="Total Visitors per Zone over Time"
      description="Daily total of unique and repeat visitors broken down by zone"
      query={query}
    >
      {(data) => {
        const series = data.zones.map((zone, i) => ({
          key: zone.id,
          name: zone.name,
          color: chart.series[i % chart.series.length],
        }));

        // Flatten { time, zones: { id: n } } → { time, [id]: n } for the chart.
        const rows = data.timeseries.map((point) => ({
          time: point.time,
          ...point.zones,
        }));

        // Stacked segments can't be compared by eye, so each zone carries its
        // range total in the legend.
        const totals = Object.fromEntries(
          data.zones.map((zone) => [
            zone.id,
            formatNumber(
              data.timeseries.reduce((sum, p) => sum + (p.zones[zone.id] ?? 0), 0),
            ),
          ]),
        );

        return (
          <div className="flex flex-col gap-3">
            <BarChart
              data={rows}
              xKey="time"
              xTickFormatter={formatShortDate}
              valueFormatter={formatNumber}
              series={series}
              stacked
              brush
            />
            <ChartLegend series={series} values={totals} />
          </div>
        );
      }}
    </WidgetCard>
  );
}

function HappinessOverTime() {
  const query = useZonesHappinessTimeseries();

  return (
    <WidgetCard
      title="Happiness per Zone Over Time"
      description="Daily happiness index per zone · low-sample days dimmed"
      query={query}
    >
      {(data) => {
        const columns: MatrixColumn[] = data.timeseries.map((point) => ({
          id: point.time,
          label: formatShortDate(point.time),
        }));

        const rows = [...data.zones].sort((a, b) => a.name.localeCompare(b.name));

        const cells: MatrixCell[] = data.timeseries.flatMap((point) =>
          rows.flatMap((zone) => {
            const entry = point.zones[zone.id];
            if (!entry) return [];
            const low = entry.checks < LOW_SAMPLE_CHECKS;
            return [
              {
                rowId: zone.id,
                colId: point.time,
                display: String(Math.round(entry.happiness)),
                color: sentimentColor(entry.happiness),
                muted: low,
                title: `${zone.name} · ${formatShortDate(point.time)} — ${entry.happiness.toFixed(1)}/100 from ${formatCompact(entry.checks)} happiness checks${low ? " (low sample)" : ""}`,
              },
            ];
          }),
        );

        return (
          <MatrixHeatmap
            rows={rows.map((z) => ({ id: z.id, label: z.name }))}
            columns={columns}
            cells={cells}
            legend={["Unhappy", "Happy"]}
            mutedNote={`low sample (under ${LOW_SAMPLE_CHECKS} happiness checks)`}
            ariaLabel="Daily happiness index per zone"
          />
        );
      }}
    </WidgetCard>
  );
}
