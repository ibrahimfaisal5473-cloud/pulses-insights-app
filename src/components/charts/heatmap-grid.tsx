"use client";

import { HEATMAP_DAYS, type HeatmapCell } from "@/types";
import { formatNumber } from "@/lib/utils";

/**
 * Day × hour occupancy heatmap. Rendered as a CSS grid (heatmaps aren't a
 * Recharts strength); teal intensity encodes visitor volume.
 */
export function HeatmapGrid({ data }: { data: HeatmapCell[] }) {
  const hours = [...new Set(data.map((c) => c.hour))].sort((a, b) => a - b);
  const max = Math.max(...data.map((c) => c.count), 1);
  const byKey = new Map(data.map((c) => [`${c.day}:${c.hour}`, c.count]));

  return (
    <div
      role="img"
      aria-label="Visitor volume by day of week and hour of day"
      className="flex flex-col gap-1"
    >
      <div
        className="grid gap-1"
        style={{ gridTemplateColumns: `2.25rem repeat(${hours.length}, 1fr)` }}
      >
        <span />
        {hours.map((h) => (
          <span
            key={h}
            className="text-center text-[10px] tabular-nums text-muted-foreground"
          >
            {h}
          </span>
        ))}

        {HEATMAP_DAYS.map((day) => (
          <HeatmapRow key={day} day={day} hours={hours} byKey={byKey} max={max} />
        ))}
      </div>

      <div className="mt-2 flex items-center gap-2 text-[11px] text-muted-foreground">
        <span>Quiet</span>
        <span
          className="h-2 w-28 rounded-full"
          style={{
            background:
              "linear-gradient(90deg, rgba(15,118,110,0.08), rgba(15,118,110,0.95))",
          }}
        />
        <span>Busy</span>
      </div>
    </div>
  );
}

function HeatmapRow({
  day,
  hours,
  byKey,
  max,
}: {
  day: string;
  hours: number[];
  byKey: Map<string, number>;
  max: number;
}) {
  return (
    <>
      <span className="flex items-center text-[11px] text-muted-foreground">{day}</span>
      {hours.map((hour) => {
        const count = byKey.get(`${day}:${hour}`) ?? 0;
        const alpha = count === 0 ? 0.04 : 0.08 + (count / max) * 0.87;
        return (
          <div
            key={hour}
            title={`${day} ${String(hour).padStart(2, "0")}:00 — ${formatNumber(count)} visitors`}
            className="h-6 rounded-[4px]"
            style={{ background: `rgba(15,118,110,${alpha.toFixed(3)})` }}
          />
        );
      })}
    </>
  );
}
