"use client";

import type { Zone } from "@/types";
import { useZones } from "@/hooks/use-visitors";
import { chart } from "@/config/chart";
import { sentimentColor } from "@/lib/sentiment";
import { formatCompact, formatNumber } from "@/lib/utils";
import { WidgetCard } from "../widget-card";
import { useLens } from "../lens";

/**
 * Zone ranking bars — lens-aware:
 *  · Visits    → total entries per zone (categorical colours)
 *  · Happiness → avg sentiment per zone (green)
 */
export function ZoneRanking() {
  const { lens } = useLens();
  const query = useZones();
  const isHappiness = lens === "happiness";

  return (
    <WidgetCard
      title={isHappiness ? "Happiness by Zone" : "Footfall by Zone"}
      description={
        isHappiness
          ? "Avg sentiment per zone, with sample size · green = happy, red = unhappy"
          : "Total entries per zone — measures movement & frequency, not unique people"
      }
      query={query}
      contentHeight={260}
    >
      {(data) => {
        const rows = [...data.zones].sort((a, b) =>
          isHappiness ? b.happiness - a.happiness : b.totalVisitors - a.totalVisitors,
        );
        const max = isHappiness
          ? 100
          : Math.max(...rows.map((z) => z.totalVisitors), 1);

        return (
          <div className="flex flex-col">
            {rows.map((zone, i) => (
              <ZoneRow
                key={zone.id}
                zone={zone}
                index={i}
                max={max}
                isHappiness={isHappiness}
              />
            ))}
          </div>
        );
      }}
    </WidgetCard>
  );
}

function ZoneRow({
  zone,
  index,
  max,
  isHappiness,
}: {
  zone: Zone;
  index: number;
  max: number;
  isHappiness: boolean;
}) {
  const value = isHappiness ? zone.happiness : zone.totalVisitors;
  const color = isHappiness
    ? sentimentColor(zone.happiness)
    : chart.series[index % chart.series.length];

  return (
    <div className="grid grid-cols-[minmax(96px,150px)_1fr_auto_auto] items-center gap-4 py-2">
      <span className="truncate text-[13px] text-muted-foreground">{zone.name}</span>
      <div className="h-3.5 overflow-hidden rounded-full bg-muted">
        <div
          className="h-full rounded-full transition-[width] duration-500"
          style={{ width: `${(value / max) * 100}%`, background: color }}
        />
      </div>
      <span className="min-w-14 text-right font-heading text-[15px] font-semibold tabular-nums">
        {isHappiness ? value.toFixed(1) : formatNumber(value)}
      </span>
      {/* An average is only as trustworthy as the sample behind it. */}
      <span className="min-w-24 text-right text-[11px] leading-tight text-muted-foreground">
        {isHappiness ? `${formatCompact(zone.happinessChecks)} happiness checks` : ""}
      </span>
    </div>
  );
}
