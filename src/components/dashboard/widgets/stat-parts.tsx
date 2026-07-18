"use client";

import type { ReactNode } from "react";
import type { UseQueryResult } from "@tanstack/react-query";
import { AlertCircle, RotateCw } from "lucide-react";
import { Button } from "@/components/ui/button";

/** Small-caps label used across the Overview stat cards. */
export function StatLabel({ children }: { children: ReactNode }) {
  return (
    <span className="text-[10px] font-bold uppercase tracking-[0.1em] text-muted-foreground">
      {children}
    </span>
  );
}

/** Compact inline error + retry for stat cards that render their own frame. */
export function WidgetError<TData>({ query }: { query: UseQueryResult<TData> }) {
  return (
    <div className="mt-4 flex flex-col items-start gap-2" role="alert">
      <span className="flex items-center gap-2 text-sm text-destructive">
        <AlertCircle className="h-4 w-4" />
        {query.error instanceof Error ? query.error.message : "Failed to load"}
      </span>
      <Button variant="outline" size="sm" onClick={() => query.refetch()}>
        <RotateCw className="h-3.5 w-3.5" />
        Retry
      </Button>
    </div>
  );
}
