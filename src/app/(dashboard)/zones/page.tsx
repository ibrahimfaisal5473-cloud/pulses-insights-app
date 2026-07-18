import { PageHeader } from "@/components/dashboard/page-header";
import { FilterBar } from "@/components/dashboard/filter-bar";
import { ReportButton } from "@/components/dashboard/report/report-button";
import { ZonesSection } from "@/components/dashboard/sections/zones-section";

/** Zone Analytics — traffic by zone, over time, and the footfall/happiness ranking. */
export default function ZoneAnalyticsPage() {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <PageHeader
          title="Zone Analytics"
          description="Footfall and sentiment broken down by zone."
        />
        <div className="flex flex-wrap items-center gap-2">
          <FilterBar />
          <ReportButton />
        </div>
      </div>

      <ZonesSection />
    </div>
  );
}
