import { PageHeader } from "@/components/dashboard/page-header";
import { FilterBar } from "@/components/dashboard/filter-bar";
import { ReportButton } from "@/components/dashboard/report/report-button";
import { VisitorsSection } from "@/components/dashboard/sections/visitors-section";

/** Visits & Happiness — daily volume, new vs repeat, the two heatmaps, and waits. */
export default function VisitorAnalyticsPage() {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <PageHeader
          title="Visitor Analytics"
          description="Visitor volume, mix, and waiting time over the selected range."
        />
        <div className="flex flex-wrap items-center gap-2">
          <FilterBar />
          <ReportButton />
        </div>
      </div>

      <VisitorsSection />
    </div>
  );
}
