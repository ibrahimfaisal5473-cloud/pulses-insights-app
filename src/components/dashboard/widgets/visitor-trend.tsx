"use client";

import { useVisitorsTimeseries } from "@/hooks/use-visitors";
import { VisitorTrendChart } from "@/components/charts/visitor-trend-chart";
import { chart } from "@/config/chart";
import { WidgetCard } from "../widget-card";

/** Visitor trend widget — /api/v1/visitors/timeseries. */
export function VisitorTrend() {
  const query = useVisitorsTimeseries();

  return (
    <WidgetCard
      title="Visitor Trend"
      description="Daily unique visitors over the last 30 days — new vs returning"
      query={query}
    >
      {(data) => (
        <div className="flex flex-col gap-3">
          <VisitorTrendChart data={data.timeseries} />
          <div className="flex gap-5 text-xs text-muted-foreground">
            <LegendSwatch color={chart.primary} label="New" />
            <LegendSwatch color={chart.secondary} label="Returning" />
          </div>
        </div>
      )}
    </WidgetCard>
  );
}

function LegendSwatch({ color, label }: { color: string; label: string }) {
  return (
    <span className="flex items-center gap-1.5">
      <span className="h-2.5 w-2.5 rounded-[3px]" style={{ background: color }} />
      {label}
    </span>
  );
}
