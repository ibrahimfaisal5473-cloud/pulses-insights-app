"use client";

import {
  Bar,
  CartesianGrid,
  ComposedChart,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { BarRow } from "./bar-chart";
import { chart } from "@/config/chart";
import { formatCompact } from "@/lib/utils";

/**
 * Bars on the left axis with a line overlaid on its own right axis — for
 * comparing a volume against an index whose scales share nothing (crowding vs.
 * sentiment). The two axes are the point: forcing both onto one would flatten
 * the line into the noise floor.
 */
export function BarLineChart({
  data,
  xKey,
  bar,
  line,
  height = 280,
  xTickFormatter,
  barFormatter = (v) => formatCompact(v),
  lineFormatter = (v) => v.toFixed(1),
  lineDomain,
}: {
  data: BarRow[];
  xKey: string;
  bar: { key: string; name: string; color: string };
  line: { key: string; name: string; color: string };
  height?: number;
  xTickFormatter?: (value: string) => string;
  barFormatter?: (value: number) => string;
  lineFormatter?: (value: number) => string;
  /** Fixed range for the line's axis; defaults to recharts' auto scale. */
  lineDomain?: [number, number];
}) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <ComposedChart data={data} margin={{ top: 8, right: 4, bottom: 0, left: -12 }}>
        <CartesianGrid strokeDasharray="3 6" stroke="var(--border)" vertical={false} />
        <XAxis
          dataKey={xKey}
          tickFormatter={xTickFormatter}
          tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
          tickLine={false}
          axisLine={false}
          minTickGap={16}
        />
        <YAxis
          yAxisId="bar"
          tickFormatter={(v) => formatCompact(Number(v))}
          tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
          tickLine={false}
          axisLine={false}
          width={48}
        />
        <YAxis
          yAxisId="line"
          orientation="right"
          domain={lineDomain}
          tick={{ fontSize: 11, fill: line.color }}
          tickLine={false}
          axisLine={false}
          width={40}
        />
        <Tooltip
          // The bar itself turns red on hover (`activeBar`), so a cursor band
          // behind it would just muddy the highlight.
          cursor={false}
          // Bar before line, matching how the chart reads top to bottom;
          // recharts otherwise lists the line first.
          itemSorter={(item) => (item.dataKey === bar.key ? 0 : 1)}
          labelFormatter={(v) => (xTickFormatter ? xTickFormatter(String(v)) : String(v))}
          formatter={(value, name) => [
            name === line.name ? lineFormatter(Number(value)) : barFormatter(Number(value)),
            String(name),
          ]}
          contentStyle={{
            background: "var(--popover)",
            border: "1px solid var(--border)",
            borderRadius: 10,
            color: "var(--popover-foreground)",
            fontSize: 12,
          }}
        />
        <Bar
          yAxisId="bar"
          dataKey={bar.key}
          name={bar.name}
          fill={bar.color}
          activeBar={{ fill: chart.primary }}
          radius={[3, 3, 0, 0]}
          maxBarSize={38}
          isAnimationActive={false}
        />
        <Line
          yAxisId="line"
          type="monotone"
          dataKey={line.key}
          name={line.name}
          stroke={line.color}
          strokeWidth={2}
          dot={{ r: 3, fill: "var(--card)", strokeWidth: 2 }}
          activeDot={{ r: 4 }}
        />
      </ComposedChart>
    </ResponsiveContainer>
  );
}
