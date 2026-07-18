"use client";

import { useZones } from "@/hooks/use-visitors";
import { ZoneTreemap, type TreemapItem } from "@/components/charts/zone-treemap";
import { chart } from "@/config/chart";
import { sentimentColor } from "@/lib/sentiment";
import { formatCompact, formatNumber } from "@/lib/utils";
import { WidgetCard } from "../widget-card";
import { useLens } from "../lens";

/**
 * Zone treemap — /api/v1/zones. Lens-aware:
 *  · Visits    → area = footfall, categorical colours
 *  · Happiness → area = happiness, colour = sentiment
 */
export function ZoneTreemapWidget() {
  const { lens } = useLens();
  const query = useZones();
  const isHappiness = lens === "happiness";

  return (
    <WidgetCard
      title={isHappiness ? "Happiness per Zone" : "Total Visitors per Zone"}
      description={
        isHappiness
          ? "Area = happiness (bigger = happier) · colour = sentiment · showing happiness checks"
          : "Total unique and repeat visitors per zone — larger blocks indicate higher traffic volume"
      }
      query={query}
      contentHeight={320}
    >
      {(data) => {
        const items: TreemapItem[] = data.zones.map((zone, i) =>
          isHappiness
            ? {
                id: zone.id,
                name: zone.name,
                value: zone.happiness,
                display: String(Math.round(zone.happiness)),
                displaySuffix: "/100",
                caption: `${formatCompact(zone.happinessChecks)} happiness checks`,
                color: sentimentColor(zone.happiness),
                title: `${zone.name} — happiness ${zone.happiness.toFixed(1)}/100 from ${formatNumber(zone.happinessChecks)} happiness checks`,
              }
            : {
                id: zone.id,
                name: zone.name,
                value: zone.totalVisitors,
                display: formatNumber(zone.totalVisitors),
                caption: `${zone.percentOfTotal}% of total`,
                color: chart.series[i % chart.series.length],
                title: `${zone.name} — ${formatNumber(zone.totalVisitors)} visitors (${zone.percentOfTotal}%)`,
              },
        );

        return <ZoneTreemap items={items} height={320} />;
      }}
    </WidgetCard>
  );
}
