"use client";

import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import { chart } from "@/config/chart";
import { formatNumber, formatPercent } from "@/lib/utils";

export type DonutSlice = {
  name: string;
  value: number;
};

/**
 * Generic donut with a center label and a right-hand legend.
 * Used for share-of-total distributions (e.g. gender).
 */
export function DonutChart({
  data,
  centerLabel,
}: {
  data: DonutSlice[];
  centerLabel: string;
}) {
  const total = data.reduce((sum, d) => sum + d.value, 0) || 1;

  return (
    <div className="flex flex-wrap items-center justify-center gap-6">
      <div className="relative h-44 w-44">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Tooltip
              formatter={(value, name) => [formatNumber(Number(value)), String(name)]}
              contentStyle={{
                background: "var(--popover)",
                border: "1px solid var(--border)",
                borderRadius: 10,
                color: "var(--popover-foreground)",
                fontSize: 12,
              }}
            />
            <Pie
              data={data}
              dataKey="value"
              nameKey="name"
              innerRadius={58}
              outerRadius={82}
              paddingAngle={2}
              strokeWidth={0}
            >
              {data.map((_, i) => (
                <Cell key={i} fill={chart.series[i % chart.series.length]} />
              ))}
            </Pie>
          </PieChart>
        </ResponsiveContainer>
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-xl font-semibold tabular-nums">
            {formatNumber(total)}
          </span>
          <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
            {centerLabel}
          </span>
        </div>
      </div>

      <ul className="flex min-w-40 flex-col gap-2.5">
        {data.map((slice, i) => (
          <li key={slice.name} className="flex items-center gap-2.5 text-sm">
            <span
              className="h-2.5 w-2.5 shrink-0 rounded-[3px]"
              style={{ background: chart.series[i % chart.series.length] }}
            />
            <span className="text-muted-foreground">{slice.name}</span>
            <span className="ml-auto font-medium tabular-nums">
              {formatNumber(slice.value)}
            </span>
            <span className="w-12 text-right text-xs tabular-nums text-muted-foreground">
              {formatPercent(slice.value / total)}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
