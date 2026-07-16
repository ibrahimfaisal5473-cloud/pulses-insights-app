"use client";

import { useVisitorCounts } from "@/hooks/use-visitors";
import { formatNumber } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { StatLabel, WidgetError } from "./stat-parts";

/** "Visits — Footfall" — total zone entries, from /api/v1/visitors/counts. */
export function Footfall() {
  const query = useVisitorCounts();

  return (
    <Card className="h-full">
      <CardContent className="flex h-full flex-col">
        <StatLabel>Visits — Footfall</StatLabel>

        {query.isPending ? (
          <div className="mt-4 flex flex-col gap-3">
            <Skeleton className="h-10 w-32" />
            <Skeleton className="h-4 w-52" />
          </div>
        ) : query.isError ? (
          <WidgetError query={query} />
        ) : (
          <>
            <span className="mt-4 font-heading text-[40px] font-semibold leading-none tabular-nums text-primary">
              {formatNumber(query.data.totalHeadcount)}
            </span>
            <p className="mt-auto pt-4 text-xs text-muted-foreground">
              Not unique — one person entering 3 zones counts as 3 visits
            </p>
          </>
        )}
      </CardContent>
    </Card>
  );
}
