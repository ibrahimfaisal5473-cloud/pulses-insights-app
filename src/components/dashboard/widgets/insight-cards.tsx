"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { useZones } from "@/hooks/use-visitors";
import { formatNumber } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { WidgetError } from "./stat-parts";

/**
 * The three auto-generated callouts, derived from /api/v1/zones:
 * the unhappiest zone, the happiest zone, and the busiest zone.
 */
export function InsightCards() {
  const query = useZones();

  if (query.isPending) {
    return (
      <>
        {Array.from({ length: 3 }).map((_, i) => (
          <Card key={i}>
            <CardContent className="flex flex-col gap-3">
              <Skeleton className="h-3 w-28" />
              <Skeleton className="h-5 w-52" />
              <Skeleton className="h-12 w-full" />
            </CardContent>
          </Card>
        ))}
      </>
    );
  }

  if (query.isError) {
    return (
      <Card className="lg:col-span-3">
        <CardContent>
          <WidgetError query={query} />
        </CardContent>
      </Card>
    );
  }

  const zones = query.data.zones;
  const avgHappiness =
    zones.reduce((sum, z) => sum + z.happiness, 0) / (zones.length || 1);
  const unhappiest = [...zones].sort((a, b) => a.happiness - b.happiness)[0];
  const happiest = [...zones].sort((a, b) => b.happiness - a.happiness)[0];
  const busiest = [...zones].sort((a, b) => b.totalVisitors - a.totalVisitors)[0];

  return (
    <>
      <Insight
        dot="var(--chart-2)"
        kicker="Zone Attention"
        metric={(avgHappiness - unhappiest.happiness).toFixed(1)}
        metricSuffix="pts below avg"
        title={`${unhappiest.name} runs unhappiest`}
        body={`${unhappiest.name} averages ${unhappiest.happiness.toFixed(1)}/100 happiness — ${(
          avgHappiness - unhappiest.happiness
        ).toFixed(1)} points under the ${avgHappiness.toFixed(
          1,
        )} cross-zone average. Worth a floor check.`}
        href="/zones"
        linkLabel="See zone analytics"
      />
      <Insight
        dot="var(--chart-5)"
        kicker="Bright Spot"
        metric={happiest.happiness.toFixed(1)}
        metricSuffix="/100"
        title={`${happiest.name} is the happiest zone`}
        body={`${happiest.name} leads on happiness at ${happiest.happiness.toFixed(
          1,
        )}/100 across the period — ahead of the ${avgHappiness.toFixed(
          1,
        )} average. Worth understanding what works here.`}
        href="/zones"
        linkLabel="See zone analytics"
      />
      <Insight
        dot="var(--chart-1)"
        kicker="Footfall"
        metric={`${Math.round(busiest.percentOfTotal)}%`}
        metricSuffix="of entries"
        title={`${busiest.name} is the busiest zone`}
        body={`${busiest.name} takes ${Math.round(
          busiest.percentOfTotal,
        )}% of all zone entries (${formatNumber(
          busiest.totalVisitors,
        )}). Staffing and queue attention land here first.`}
        href="/zones"
        linkLabel="See footfall"
      />
    </>
  );
}

function Insight({
  dot,
  kicker,
  metric,
  metricSuffix,
  title,
  body,
  href,
  linkLabel,
}: {
  dot: string;
  kicker: string;
  metric: string;
  metricSuffix: string;
  title: string;
  body: string;
  href: string;
  linkLabel: string;
}) {
  return (
    <Card>
      <CardContent className="flex h-full flex-col">
        <div className="flex items-start justify-between gap-3">
          <span className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.1em] text-muted-foreground">
            <span
              className="h-2 w-2 shrink-0 rounded-full"
              style={{ background: dot }}
            />
            {kicker}
          </span>
          <span className="shrink-0 whitespace-nowrap">
            <span className="font-heading text-2xl font-semibold tracking-[-0.03em] tabular-nums">
              {metric}
            </span>
            <span className="ml-1 text-[11px] font-medium text-muted-foreground">
              {metricSuffix}
            </span>
          </span>
        </div>

        <h3 className="font-heading mt-3 text-[15px] leading-snug font-semibold">
          {title}
        </h3>
        <p className="mt-2 text-[12.5px] leading-[1.6] text-muted-foreground">{body}</p>

        <Link
          href={href}
          className="mt-auto inline-flex items-center gap-1.5 pt-4 text-xs font-medium text-primary hover:underline"
        >
          {linkLabel}
          <ArrowRight className="h-3 w-3" />
        </Link>
      </CardContent>
    </Card>
  );
}
