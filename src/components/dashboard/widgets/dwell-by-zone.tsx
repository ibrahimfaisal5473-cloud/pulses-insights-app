"use client";

import { useDwellByZone } from "@/hooks/use-journeys";
import { RankedBars } from "@/components/charts/ranked-bars";
import { chart } from "@/config/chart";
import { sentimentColor } from "@/lib/sentiment";
import { WidgetCard } from "../widget-card";
import { useLens } from "../lens";

/**
 * Average dwell per zone — /api/v1/journey/dwell. Lens-aware: the Happiness
 * lens colours each bar by the zone's sentiment, so a long bar in a poor
 * colour reads as "they're stuck here and they don't like it".
 */
export function DwellByZone() {
  const { lens } = useLens();
  const query = useDwellByZone();
  const isHappiness = lens === "happiness";

  return (
    <WidgetCard
      title="Average Dwell Time by Zone"
      description={
        isHappiness
          ? "Where visitors spend their time · colour = sentiment"
          : "Where visitors spend their time"
      }
      query={query}
      contentHeight={260}
    >
      {(data) => {
        const worst = data.zones.reduce(
          (low, zone) => (zone.happiness < low.happiness ? zone : low),
          data.zones[0],
        );

        return (
          <RankedBars
            rows={data.zones.map((zone) => ({
              id: zone.id,
              label: zone.name,
              value: zone.minutes,
              display: `${zone.minutes} min`,
              color: isHappiness ? sentimentColor(zone.happiness) : chart.series[2],
              // Flag the unhappiest zone — the colour ramp alone is too subtle
              // to pick it out of a list this tight.
              labelColor: isHappiness && zone.id === worst?.id ? chart.primary : undefined,
              title: isHappiness
                ? `${zone.name} — ${zone.minutes} min average dwell, sentiment ${zone.happiness.toFixed(1)}/100`
                : undefined,
            }))}
          />
        );
      }}
    </WidgetCard>
  );
}
