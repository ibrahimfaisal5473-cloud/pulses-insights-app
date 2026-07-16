"use client";

import { useVisitorCounts } from "@/hooks/use-visitors";
import { formatNumber } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { StatLabel, WidgetError } from "./stat-parts";

/** "Unique People" — total = new + repeat, from /api/v1/visitors/counts. */
export function UniquePeople() {
  const query = useVisitorCounts();

  return (
    <Card className="h-full">
      <CardContent className="flex h-full flex-col">
        <StatLabel>Unique People</StatLabel>

        {query.isPending ? (
          <div className="mt-4 flex flex-col gap-3">
            <Skeleton className="h-10 w-40" />
            <Skeleton className="h-4 w-64" />
          </div>
        ) : query.isError ? (
          <WidgetError query={query} />
        ) : (
          <>
            <div className="mt-4 flex flex-wrap items-baseline gap-x-4 gap-y-2">
              <div>
                <span className="font-heading text-[40px] font-semibold leading-none tabular-nums text-primary">
                  {formatNumber(query.data.totalVisitors)}
                </span>
                <p className="mt-1.5 text-[10px] uppercase tracking-wider text-muted-foreground">
                  Total Visitors
                </p>
              </div>
              <span className="font-heading text-2xl text-muted-foreground">=</span>
              <div>
                <span className="font-heading text-[28px] font-semibold leading-none tabular-nums">
                  {formatNumber(query.data.newVisitors)}
                </span>
                <p className="mt-1.5 text-[10px] uppercase tracking-wider text-muted-foreground">
                  New
                </p>
              </div>
              <span className="font-heading text-2xl text-muted-foreground">+</span>
              <div>
                <span className="font-heading text-[28px] font-semibold leading-none tabular-nums">
                  {formatNumber(query.data.repeatedVisitors)}
                </span>
                <p className="mt-1.5 text-[10px] uppercase tracking-wider text-muted-foreground">
                  Repeat
                </p>
              </div>
            </div>
            <p className="mt-auto pt-4 text-xs text-muted-foreground">
              One person, counted once — even across many visits
            </p>
          </>
        )}
      </CardContent>
    </Card>
  );
}
