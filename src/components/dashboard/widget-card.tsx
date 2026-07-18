"use client";

import { useRef, type ReactNode } from "react";
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
import { WidgetMenu } from "./widget-menu";
import { exportAttrs } from "@/lib/export/attrs";

/**
 * Shared frame for dashboard widgets. Owns the widget lifecycle UX so every
 * widget gets identical loading (skeleton), error (message + retry), and
 * success states — charts stay purely presentational.
 *
 * It also owns exporting: the card tags itself with WIDGET_EXPORT_ATTR (which
 * is how the full PDF report discovers widgets to capture) and renders the
 * per-widget download menu once data has arrived.
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
  const cardRef = useRef<HTMLDivElement>(null);
  // Exporting a skeleton or an error state is never useful, so the menu only
  // appears once there is a rendered chart to capture.
  const exportable = !query.isPending && !query.isError;

  return (
    <Card ref={cardRef} {...exportAttrs(title)}>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        {description && <CardDescription>{description}</CardDescription>}
        {(stat !== undefined || exportable) && (
          <CardAction className="flex items-center gap-2">
            {stat !== undefined && (
              <span className="font-heading text-[25px] leading-none font-semibold tracking-[-0.03em] tabular-nums">
                {stat}
              </span>
            )}
            {exportable && <WidgetMenu targetRef={cardRef} title={title} />}
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
