"use client";

import { HEATMAP_DAYS } from "@/types";

export type HeatmapGridCell = {
  day: string;
  hour: number;
  /** 0–1 intensity used for the fill. */
  intensity: number;
  /** Tooltip text for the cell. */
  label: string;
  /** Dimmed (e.g. too few happiness checks to trust). */
  muted?: boolean;
};

/**
 * Day × hour heatmap rendered as a CSS grid (heatmaps aren't a Recharts
 * strength). Generic over the metric — callers map their data to an
 * intensity plus a label, and pick the colour scale.
 */
export function HeatmapGrid({
  cells,
  scale = "red",
  legend,
  ariaLabel,
}: {
  cells: HeatmapGridCell[];
  /** red = volume (quiet→busy), green = sentiment (unhappy→happy). */
  scale?: "red" | "green";
  legend: [string, string];
  ariaLabel: string;
}) {
  const hours = [...new Set(cells.map((c) => c.hour))].sort((a, b) => a - b);
  const byKey = new Map(cells.map((c) => [`${c.day}:${c.hour}`, c]));
  const base = scale === "green" ? "110,139,61" : "215,25,33";

  return (
    <div className="flex flex-col gap-2">
      <div className="overflow-x-auto">
        <div
          role="img"
          aria-label={ariaLabel}
          className="grid min-w-[520px] gap-1"
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
            <Row key={day} day={day} hours={hours} byKey={byKey} base={base} />
          ))}
        </div>
      </div>

      <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
        <span>{legend[0]}</span>
        <span
          className="h-2 w-28 rounded-full"
          style={{
            background: `linear-gradient(90deg, rgba(${base},0.08), rgba(${base},0.95))`,
          }}
        />
        <span>{legend[1]}</span>
      </div>
    </div>
  );
}

function Row({
  day,
  hours,
  byKey,
  base,
}: {
  day: string;
  hours: number[];
  byKey: Map<string, HeatmapGridCell>;
  base: string;
}) {
  return (
    <>
      <span className="flex items-center text-[11px] text-muted-foreground">{day}</span>
      {hours.map((hour) => {
        const cell = byKey.get(`${day}:${hour}`);
        const alpha = cell ? 0.08 + cell.intensity * 0.87 : 0.04;
        return (
          <div
            key={hour}
            title={cell?.label ?? `${day} ${hour}:00 — no data`}
            className="h-6 rounded-[4px]"
            style={{
              background: `rgba(${base},${alpha.toFixed(3)})`,
              opacity: cell?.muted ? 0.35 : 1,
            }}
          />
        );
      })}
    </>
  );
}
