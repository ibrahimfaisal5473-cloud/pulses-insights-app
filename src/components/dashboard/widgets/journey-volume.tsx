"use client";

import { useJourneyVolume } from "@/hooks/use-journeys";
import { BarChart, ChartLegend } from "@/components/charts/bar-chart";
import { BarLineChart } from "@/components/charts/bar-line-chart";
import { chart } from "@/config/chart";
import { formatNumber } from "@/lib/utils";
import { WidgetCard } from "../widget-card";
import { useLens } from "../lens";

const hourLabel = (h: string | number) => `${String(h).padStart(2, "0")}:00`;

/**
 * Movement volume by hour — /api/v1/journey/volume. Lens-aware:
 *  · Visits    → transitions per hour
 *  · Happiness → people in the centre, overlaid with the sentiment curve
 */
export function JourneyVolume() {
  const { lens } = useLens();
  const query = useJourneyVolume();

  if (lens === "happiness") return <CrowdingVsSentiment query={query} />;

  return (
    <WidgetCard
      title="Journey Volume by Hour"
      description="When zone-to-zone movement peaks across the day"
      query={query}
      contentHeight={260}
    >
      {(data) => (
        <div className="flex flex-col gap-3">
          <BarChart
            height={220}
            data={data.hours}
            xKey="hour"
            xTickFormatter={hourLabel}
            valueFormatter={formatNumber}
            series={[{ key: "transitions", name: "Transitions", color: chart.primary }]}
            brush
          />
          <p className="text-xs text-muted-foreground">
            Peak movement at{" "}
            <span className="font-medium text-foreground">{hourLabel(data.peakHour)}</span> —{" "}
            {formatNumber(data.peakTransitions)} transitions/hr
          </p>
        </div>
      )}
    </WidgetCard>
  );
}

const SERIES = [
  { key: "occupancy", name: "People in centre", color: chart.muted },
  { key: "happiness", name: "Avg sentiment", color: chart.happiness },
];

/** The Happiness-lens face of the volume widget: does a full centre feel worse? */
function CrowdingVsSentiment({ query }: { query: ReturnType<typeof useJourneyVolume> }) {
  return (
    <WidgetCard
      title="Crowding vs Sentiment"
      description="People in the centre per hour, overlaid with average sentiment"
      query={query}
      contentHeight={300}
    >
      {(data) => {
        const busiest = data.hours.reduce(
          (peak, h) => (h.occupancy > peak.occupancy ? h : peak),
          data.hours[0],
        );
        const calmest = data.hours.reduce(
          (low, h) => (h.occupancy < low.occupancy ? h : low),
          data.hours[0],
        );
        const gap = calmest.happiness - busiest.happiness;

        return (
          <div className="flex flex-col gap-3">
            <BarLineChart
              height={250}
              data={data.hours.map((h) => ({ ...h }))}
              xKey="hour"
              xTickFormatter={hourLabel}
              bar={SERIES[0]}
              line={SERIES[1]}
              lineDomain={[55, 100]}
              barFormatter={formatNumber}
              lineFormatter={(v) => `${v.toFixed(1)}/100`}
            />
            <ChartLegend series={SERIES} />
            <p className="text-xs text-muted-foreground">
              Busiest at{" "}
              <span className="font-medium text-foreground">{hourLabel(busiest.hour)}</span> with{" "}
              {formatNumber(busiest.occupancy)} people —{" "}
              {gap > 0.5 ? (
                <>
                  sentiment runs{" "}
                  <span className="font-medium text-foreground">{gap.toFixed(1)} points</span>{" "}
                  lower than at the quietest hour.
                </>
              ) : (
                <>sentiment holds steady even at peak.</>
              )}
            </p>
          </div>
        );
      }}
    </WidgetCard>
  );
}
