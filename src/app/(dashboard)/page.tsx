import { PageHeader } from "@/components/dashboard/page-header";
import { FilterBar } from "@/components/dashboard/filter-bar";
import { ReportButton } from "@/components/dashboard/report/report-button";
import { OverviewSection } from "@/components/dashboard/sections/overview-section";

/**
 * Overview — mirrors the Insights reference layout: headline stats, generated
 * insight callouts, happiness over time, demographic splits, and the zone
 * ranking. Every widget fetches independently from its own endpoint, so one
 * slow or failing endpoint never blocks the rest of the page.
 *
 * The body lives in OverviewSection so the full PDF report renders exactly
 * what this route renders.
 */
export default function OverviewPage() {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <PageHeader
          title="Overview"
          description="Key visitor metrics across the selected range."
        />
        <div className="flex flex-wrap items-center gap-2">
          <FilterBar />
          <ReportButton />
        </div>
      </div>

      <OverviewSection />
    </div>
  );
}
