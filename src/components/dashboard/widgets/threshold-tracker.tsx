"use client";

import { useThresholdTracker } from "@/hooks/use-journeys";
import { BarChart } from "@/components/charts/bar-chart";
import { chart } from "@/config/chart";
import { formatNumber, formatShortDate } from "@/lib/utils";
import { WidgetCard } from "../widget-card";

/**
 * Daily share of visits past the experience threshold —
 * /api/v1/journey/threshold. Happiness-lens only.
 */
export function ThresholdTracker() {
  const query = useThresholdTracker();
  const minutes = query.data?.thresholdMinutes;

  return (
    <WidgetCard
      // Threshold comes from the API, so stay generic until it arrives rather
      // than guessing a number the data might contradict.
      title={
        minutes ? `${minutes}-Minute Threshold Tracker` : "Threshold Tracker"
      }
      description={
        minutes
          ? `Share of visits exceeding the ${minutes}-min experience threshold each day`
          : "Share of visits exceeding the experience threshold each day"
      }
      query={query}
      contentHeight={300}
      stat={query.data ? `${query.data.averagePct}%` : undefined}
    >
      {(data) => (
        <div className="flex flex-col gap-3">
          <BarChart
            height={250}
            data={data.points.map((p) => ({ ...p }))}
            xKey="date"
            xTickFormatter={formatShortDate}
            // The worst day should be findable at a glance, not by hovering
            // every bar in the range.
            cellColor={(row) =>
              row.date === data.peakDate ? chart.series[3] : chart.primary
            }
            valueFormatter={(v, row) =>
              row
                ? `${v}% · ${formatNumber(Number(row.visits))} visits > ${data.thresholdMinutes} min`
                : `${v}%`
            }
            series={[{ key: "sharePct", name: "Over threshold", color: chart.primary }]}
            brush
          />
          <p className="text-xs text-muted-foreground">
            Worst day{" "}
            <span className="font-medium text-foreground">
              {formatShortDate(data.peakDate)}
            </span>{" "}
            — averaging{" "}
            <span className="font-medium text-foreground">{data.averagePct}%</span> of visits
            past {data.thresholdMinutes} minutes across the range.
          </p>
        </div>
      )}
    </WidgetCard>
  );
}
