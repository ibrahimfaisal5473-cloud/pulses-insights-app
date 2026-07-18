import { PageHeader } from "@/components/dashboard/page-header";
import { FilterBar } from "@/components/dashboard/filter-bar";
import { ReportButton } from "@/components/dashboard/report/report-button";
import { DissatisfiedSection } from "@/components/dashboard/sections/dissatisfied-section";

/**
 * Dissatisfied Visitors — the daily review queue. Everything here is
 * anonymous (hashed face tags only), so the team can act on the floor
 * without identifying anyone.
 */
export default function DissatisfiedVisitorsPage() {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <PageHeader
          title="Dissatisfied Visitors"
          description="Low-sentiment visits flagged for follow-up on the floor."
        />
        <div className="flex flex-wrap items-center gap-2">
          <FilterBar />
          <ReportButton />
        </div>
      </div>

      <DissatisfiedSection />
    </div>
  );
}
