"use client";

import type { ReactNode } from "react";
import type { UseQueryResult } from "@tanstack/react-query";
import { AlertCircle, RotateCw } from "lucide-react";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

/**
 * Shared frame for dashboard widgets. Owns the widget lifecycle UX so every
 * widget gets identical loading (skeleton), error (message + retry), and
 * success states — charts stay purely presentational.
 */
export function WidgetCard<TData>({
  title,
  description,
  query,
  contentHeight = 280,
  stat,
  children,
}: {
  title: string;
  description?: string;
  query: UseQueryResult<TData>;
  /** Height used for the skeleton so layout doesn't shift while loading. */
  contentHeight?: number;
  /** Headline figure shown at the top-right of the card. */
  stat?: ReactNode;
  children: (data: TData) => ReactNode;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        {description && <CardDescription>{description}</CardDescription>}
        {stat !== undefined && (
          <CardAction className="font-heading text-[28px] leading-none font-semibold tracking-[-0.03em] tabular-nums">
            {stat}
          </CardAction>
        )}
      </CardHeader>
      <CardContent>
        {query.isPending ? (
          <Skeleton className="w-full" style={{ height: contentHeight }} />
        ) : query.isError ? (
          <div
            className="flex w-full flex-col items-center justify-center gap-3 text-center"
            style={{ height: contentHeight }}
            role="alert"
          >
            <AlertCircle className="h-6 w-6 text-destructive" />
            <div>
              <p className="text-[13px] font-semibold">Couldn&apos;t load this widget</p>
              <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                {query.error instanceof Error ? query.error.message : "Unknown error"}
              </p>
            </div>
            <Button variant="outline" size="sm" onClick={() => query.refetch()}>
              <RotateCw className="h-3.5 w-3.5" />
              Retry
            </Button>
          </div>
        ) : (
          children(query.data)
        )}
      </CardContent>
    </Card>
  );
}
