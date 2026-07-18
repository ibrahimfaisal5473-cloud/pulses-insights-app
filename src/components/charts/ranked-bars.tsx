"use client";

import { chart } from "@/config/chart";

export type RankedBar = {
  id: string;
  label: string;
  value: number;
  /** Formatted value shown on the right. */
  display: string;
  color?: string;
  /** Overrides the muted label colour — for singling a row out. */
  labelColor?: string;
  /** Native tooltip for the row. */
  title?: string;
};

/**
 * Horizontal ranked bar list — used for footfall/happiness/dwell rankings.
 * Rows are pre-sorted by the caller.
 */
export function RankedBars({
  rows,
  max,
  labelWidth = "150px",
}: {
  rows: RankedBar[];
  /** Scale ceiling; defaults to the largest value. */
  max?: number;
  labelWidth?: string;
}) {
  const ceiling = max ?? Math.max(...rows.map((r) => r.value), 1);

  return (
    <div className="flex flex-col">
      {rows.map((row, i) => (
        <div
          key={row.id}
          className="grid items-center gap-4 py-2"
          style={{ gridTemplateColumns: `minmax(88px, ${labelWidth}) 1fr auto` }}
          title={row.title}
        >
          <span
            className="truncate text-[13px]"
            style={{ color: row.labelColor ?? "var(--muted-foreground)" }}
          >
            {row.label}
          </span>
          <div className="h-3.5 overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full transition-[width] duration-500"
              style={{
                width: `${Math.max(0, (row.value / ceiling) * 100)}%`,
                background: row.color ?? chart.series[i % chart.series.length],
              }}
            />
          </div>
          <span className="min-w-16 text-right font-heading text-[15px] font-semibold tabular-nums">
            {row.display}
          </span>
        </div>
      ))}
    </div>
  );
}
