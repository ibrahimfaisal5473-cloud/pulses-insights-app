"use client";

import { useHappinessTimeseries } from "@/hooks/use-visitors";
import { MoodGauge } from "@/components/charts/mood-gauge";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { WidgetError } from "./stat-parts";

/**
 * Visitor mood gauge — the happiness index rescaled to 0–10, from
 * /api/v1/visitors/happiness/timeseries.
 */
export function VisitorMood() {
  const query = useHappinessTimeseries();

  return (
    <Card className="h-full">
      <CardContent className="flex h-full items-center justify-center">
        {query.isPending ? (
          <div className="flex flex-col items-center gap-3">
            <Skeleton className="h-[106px] w-[190px] rounded-t-full" />
            <Skeleton className="h-3 w-24" />
          </div>
        ) : query.isError ? (
          <WidgetError query={query} />
        ) : (
          <MoodGauge score={query.data.score / 10} />
        )}
      </CardContent>
    </Card>
  );
}
