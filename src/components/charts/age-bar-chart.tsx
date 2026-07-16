"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { AGE_BANDS, type AgeDistribution } from "@/types";
import { chart } from "@/config/chart";
import { formatCompact, formatNumber } from "@/lib/utils";

/** Horizontal bars — visitors per age band, in band order. */
export function AgeBarChart({ data }: { data: AgeDistribution }) {
  const rows = AGE_BANDS.map((band) => ({ band, visitors: data[band] }));

  return (
    <ResponsiveContainer width="100%" height={240}>
      <BarChart
        data={rows}
        layout="vertical"
        margin={{ top: 0, right: 12, bottom: 0, left: -14 }}
      >
        <CartesianGrid strokeDasharray="3 6" stroke="var(--border)" horizontal={false} />
        <XAxis
          type="number"
          tickFormatter={formatCompact}
          tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
          tickLine={false}
          axisLine={false}
        />
        <YAxis
          type="category"
          dataKey="band"
          tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
          tickLine={false}
          axisLine={false}
          width={52}
        />
        <Tooltip
          cursor={{ fill: "var(--muted)", opacity: 0.4 }}
          formatter={(value) => [formatNumber(Number(value)), "Visitors"]}
          contentStyle={{
            background: "var(--popover)",
            border: "1px solid var(--border)",
            borderRadius: 10,
            color: "var(--popover-foreground)",
            fontSize: 12,
          }}
        />
        <Bar dataKey="visitors" fill={chart.primary} radius={[0, 4, 4, 0]} barSize={18} />
      </BarChart>
    </ResponsiveContainer>
  );
}
