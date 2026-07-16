"use client";

import { Footprints, UserPlus, Users, RefreshCw } from "lucide-react";
import { useVisitorCounts } from "@/hooks/use-visitors";
import { formatNumber, formatPercent } from "@/lib/utils";
import { KpiCard, KpiCardError, KpiCardSkeleton } from "../kpi-card";

/**
 * KPI tiles driven by /api/v1/visitors/counts.
 * Renders four cards from a single independent fetch.
 */
export function VisitorKpis() {
  const query = useVisitorCounts();

  if (query.isPending) {
    return (
      <>
        {Array.from({ length: 4 }).map((_, i) => (
          <KpiCardSkeleton key={i} />
        ))}
      </>
    );
  }

  if (query.isError) {
    const message =
      query.error instanceof Error ? query.error.message : "Failed to load";
    return (
      <>
        <KpiCardError label="Unique Visitors" message={message} />
        <KpiCardError label="New Visitors" message={message} />
        <KpiCardError label="Returning Visitors" message={message} />
        <KpiCardError label="Total Footfall" message={message} />
      </>
    );
  }

  const counts = query.data;
  const newShare = counts.totalVisitors
    ? counts.newVisitors / counts.totalVisitors
    : 0;

  return (
    <>
      <KpiCard
        label="Unique Visitors"
        value={formatNumber(counts.totalVisitors)}
        sub="One person counted once, last 30 days"
        icon={Users}
      />
      <KpiCard
        label="New Visitors"
        value={formatNumber(counts.newVisitors)}
        sub={`${formatPercent(newShare)} of all visitors`}
        icon={UserPlus}
      />
      <KpiCard
        label="Returning Visitors"
        value={formatNumber(counts.repeatedVisitors)}
        sub={`${formatPercent(1 - newShare)} of all visitors`}
        icon={RefreshCw}
      />
      <KpiCard
        label="Total Footfall"
        value={formatNumber(counts.totalHeadcount)}
        sub="Zone entries — not unique people"
        icon={Footprints}
      />
    </>
  );
}
