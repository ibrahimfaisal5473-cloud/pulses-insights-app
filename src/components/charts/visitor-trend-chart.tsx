"use client";

import { memo } from "react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { VisitorsTimeseriesPoint } from "@/types";
import { axisTick, chart, tooltipStyle } from "@/config/chart";
import { formatCompact, formatNumber, formatShortDate } from "@/lib/utils";

/**
 * Daily visitors as stacked areas (new + returning). Presentational only —
 * data arrives via props from the widget container.
 */
export const VisitorTrendChart = memo(function VisitorTrendChart({
  data,
}: {
  data: VisitorsTimeseriesPoint[];
}) {
  return (
    <ResponsiveContainer width="100%" height={280}>
      <AreaChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: -12 }}>
        <defs>
          <linearGradient id="fillNew" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={chart.primary} stopOpacity={0.35} />
            <stop offset="100%" stopColor={chart.primary} stopOpacity={0.04} />
          </linearGradient>
          <linearGradient id="fillRepeat" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={chart.secondary} stopOpacity={0.35} />
            <stop offset="100%" stopColor={chart.secondary} stopOpacity={0.04} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 6" stroke="var(--border)" vertical={false} />
        <XAxis
          dataKey="time"
          tickFormatter={formatShortDate}
          tick={axisTick}
          tickLine={false}
          axisLine={false}
          minTickGap={28}
        />
        <YAxis
          tickFormatter={formatCompact}
          tick={axisTick}
          tickLine={false}
          axisLine={false}
          width={48}
        />
        <Tooltip
          labelFormatter={(v) => formatShortDate(String(v))}
          formatter={(value, name) => [
            formatNumber(Number(value)),
            name === "new" ? "New" : "Returning",
          ]}
          contentStyle={tooltipStyle}
        />
        <Area
          dataKey="new"
          stackId="visitors"
          stroke={chart.primary}
          fill="url(#fillNew)"
          strokeWidth={1.8}
        />
        <Area
          dataKey="repeated"
          stackId="visitors"
          stroke={chart.secondary}
          fill="url(#fillRepeat)"
          strokeWidth={1.8}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
});
