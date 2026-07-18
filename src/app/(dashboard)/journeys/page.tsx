import { PageHeader } from "@/components/dashboard/page-header";
import { FilterBar } from "@/components/dashboard/filter-bar";
import { ReportButton } from "@/components/dashboard/report/report-button";
import { JourneysSection } from "@/components/dashboard/sections/journeys-section";

/** Visitor Journeys — flow between phases, common paths, dwell, and volume. */
export default function VisitorJourneysPage() {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <PageHeader
          title="Visitor Journeys"
          description="How visitors move between zones and where they dwell."
        />
        <div className="flex flex-wrap items-center gap-2">
          <FilterBar />
          <ReportButton />
        </div>
      </div>

      <JourneysSection />
    </div>
  );
}
