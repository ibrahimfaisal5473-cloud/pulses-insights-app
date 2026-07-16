"use client";

import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { HappinessPoint } from "@/types";
import { chart } from "@/config/chart";
import { formatShortDate } from "@/lib/utils";

/**
 * Happiness index (0–100) over time. Presentational only — data arrives via
 * props from the widget container.
 */
export function HappinessTrendChart({ data }: { data: HappinessPoint[] }) {
  return (
    <ResponsiveContainer width="100%" height={280}>
      <AreaChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: -12 }}>
        <defs>
          <linearGradient id="fillHappiness" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={chart.happiness} stopOpacity={0.32} />
            <stop offset="100%" stopColor={chart.happiness} stopOpacity={0.03} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 6" stroke="var(--border)" vertical={false} />
        <XAxis
          dataKey="time"
          tickFormatter={formatShortDate}
          tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
          tickLine={false}
          axisLine={false}
          minTickGap={28}
        />
        <YAxis
          domain={[60, 100]}
          tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
          tickLine={false}
          axisLine={false}
          width={48}
        />
        <Tooltip
          labelFormatter={(v) => formatShortDate(String(v))}
          formatter={(value) => [`${Number(value).toFixed(1)}/100`, "Happiness"]}
          contentStyle={{
            background: "var(--popover)",
            border: "1px solid var(--border)",
            borderRadius: 10,
            color: "var(--popover-foreground)",
            fontSize: 12,
          }}
        />
        <Area
          dataKey="value"
          stroke={chart.happiness}
          fill="url(#fillHappiness)"
          strokeWidth={1.9}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}
