import type { LucideIcon } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

/** Single KPI stat tile: icon, label, big value, optional context line. */
export function KpiCard({
  label,
  value,
  sub,
  icon: Icon,
}: {
  label: string;
  value: string;
  sub?: string;
  icon: LucideIcon;
}) {
  return (
    <Card>
      <CardContent className="flex flex-col gap-2.5 pt-1">
        <div className="flex items-center gap-2.5">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-teal-600/10 text-teal-700 dark:bg-teal-400/10 dark:text-teal-300">
            <Icon className="h-4 w-4" />
          </span>
          <span className="text-xs font-medium text-muted-foreground">{label}</span>
        </div>
        <span className="text-[26px] font-semibold leading-none tracking-tight tabular-nums">
          {value}
        </span>
        {sub && <span className="text-xs text-muted-foreground">{sub}</span>}
      </CardContent>
    </Card>
  );
}

/** Loading placeholder matching KpiCard's footprint. */
export function KpiCardSkeleton() {
  return (
    <Card>
      <CardContent className="flex flex-col gap-3 pt-1">
        <div className="flex items-center gap-2.5">
          <Skeleton className="h-8 w-8 rounded-lg" />
          <Skeleton className="h-3 w-24" />
        </div>
        <Skeleton className="h-7 w-20" />
        <Skeleton className="h-3 w-28" />
      </CardContent>
    </Card>
  );
}

/** Error placeholder matching KpiCard's footprint. */
export function KpiCardError({ label, message }: { label: string; message: string }) {
  return (
    <Card>
      <CardContent className="flex flex-col gap-2.5 pt-1" role="alert">
        <span className="text-xs font-medium text-muted-foreground">{label}</span>
        <span className="text-sm text-destructive">{message}</span>
      </CardContent>
    </Card>
  );
}
