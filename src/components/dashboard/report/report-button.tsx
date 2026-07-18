"use client";

import { useCallback, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import { Download, Loader2 } from "lucide-react";
import { AGE_OPTIONS, GENDERS, resolveRange, useFilters } from "@/hooks/use-filters";
import { siteConfig } from "@/config/site";
import { formatDateRange } from "@/lib/utils";
import type { ReportMeta, ReportProgress } from "@/lib/export/report";

/**
 * "Download PDF Report" — captures every widget across all five dashboard
 * sections into one paginated PDF, honouring the currently applied filters.
 *
 * The renderer (and with it html2canvas + jsPDF) is loaded on demand: it is
 * only needed once a user actually asks for a report.
 */

const ReportRenderer = dynamic(
  () => import("./report-renderer").then((m) => m.ReportRenderer),
  { ssr: false },
);

/** Human summary of the active filters for the report cover page. */
function describeFilters(
  zones: string[],
  genders: string[],
  ages: string[],
): string {
  const parts: string[] = [];

  if (zones.length) {
    parts.push(`${zones.length} zone${zones.length === 1 ? "" : "s"}`);
  }
  if (genders.length && genders.length < GENDERS.length) {
    parts.push(
      genders
        .map((g) => GENDERS.find((o) => o.value === g)?.label ?? g)
        .join(", "),
    );
  }
  if (ages.length && ages.length < AGE_OPTIONS.length) {
    parts.push(`Ages ${ages.join(", ")}`);
  }

  return parts.join(" · ");
}

export function ReportButton() {
  const filters = useFilters();
  const [progress, setProgress] = useState<ReportProgress | null>(null);
  const [running, setRunning] = useState(false);

  const meta = useMemo<ReportMeta>(() => {
    const { start, end } = resolveRange(filters);
    return {
      title: siteConfig.name,
      range: formatDateRange(start, end),
      filters: describeFilters(filters.zones, filters.genders, filters.ages),
    };
  }, [filters]);

  const handleDone = useCallback((error?: unknown) => {
    if (error) console.error("Report export failed", error);
    setRunning(false);
    setProgress(null);
  }, []);

  const label = !running
    ? "Download PDF Report"
    : progress && progress.total > 0
      ? `Building ${progress.done} / ${progress.total}`
      : "Preparing report…";

  return (
    <>
      <button
        type="button"
        onClick={() => {
          setProgress(null);
          setRunning(true);
        }}
        disabled={running}
        aria-live="polite"
        className="inline-flex h-9 items-center gap-2 rounded-full bg-primary pr-1.5 pl-4 text-[13px] font-medium text-primary-foreground transition-colors outline-none hover:bg-primary/90 focus-visible:ring-3 focus-visible:ring-ring/50 disabled:opacity-70"
      >
        {label}
        <span className="flex size-6 items-center justify-center rounded-full bg-primary-foreground/20">
          {running ? (
            <Loader2 className="size-3.5 animate-spin" />
          ) : (
            <Download className="size-3.5" />
          )}
        </span>
      </button>

      {running && (
        <ReportRenderer meta={meta} onProgress={setProgress} onDone={handleDone} />
      )}
    </>
  );
}
