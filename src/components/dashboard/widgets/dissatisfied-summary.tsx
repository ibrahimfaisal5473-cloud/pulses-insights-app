"use client";

import { Frown, Lock } from "lucide-react";
import { useDissatisfiedSummary } from "@/hooks/use-dissatisfied";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { formatNumber } from "@/lib/utils";
import { WidgetError } from "./stat-parts";

function formatDay(iso: string) {
  return new Date(`${iso}T00:00:00Z`).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  });
}

/** Daily review banner — /api/v1/dissatisfied/summary. */
export function DissatisfiedSummaryBanner() {
  const query = useDissatisfiedSummary();

  return (
    <Card className="border-l-4 border-l-primary">
      <CardContent>
        {query.isPending ? (
          <div className="flex flex-col gap-2">
            <Skeleton className="h-5 w-3/4" />
            <Skeleton className="h-4 w-1/2" />
          </div>
        ) : query.isError ? (
          <WidgetError query={query} />
        ) : (
          <div className="flex flex-wrap items-center gap-5">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
              <Frown className="h-6 w-6" />
            </span>

            <div className="min-w-64 flex-1">
              <p className="text-sm">
                On{" "}
                <span className="font-medium">{formatDay(query.data.date)}</span>,{" "}
                {query.data.dissatisfiedCount} visitors were dissatisfied —{" "}
                {query.data.pct}% of {formatNumber(query.data.totalVisits)} visits.
                Below is each one, anonymously, so the team can investigate on the
                floor.
              </p>
              <p className="mt-1.5 flex items-center gap-1.5 text-xs text-muted-foreground">
                <Lock className="h-3 w-3" />
                No photos or identities — anonymous face tags only, reviewed like
                negative survey comments.
              </p>
            </div>

            <div className="text-right">
              <span className="font-heading text-3xl font-semibold tabular-nums text-primary">
                {query.data.dissatisfiedCount}
              </span>
              <span className="block text-[10px] uppercase tracking-wider text-muted-foreground">
                Dissatisfied · {query.data.pct}%
              </span>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
