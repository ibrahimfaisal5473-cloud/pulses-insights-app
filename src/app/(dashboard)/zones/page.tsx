import { PageHeader } from "@/components/dashboard/page-header";
import { FilterBar } from "@/components/dashboard/filter-bar";
import { LensProvider, LensSwitch } from "@/components/dashboard/lens";
import { ZoneTreemapWidget } from "@/components/dashboard/widgets/zone-treemap-widget";
import { ZonesOverTime } from "@/components/dashboard/widgets/zones-over-time";
import { ZoneRanking } from "@/components/dashboard/widgets/zone-ranking";

/** Zone Analytics — traffic by zone, over time, and the footfall/happiness ranking. */
export default function ZoneAnalyticsPage() {
  return (
    <LensProvider>
      <div className="flex flex-col gap-6">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <PageHeader
            title="Zone Analytics"
            description="Footfall and sentiment broken down by zone."
          />
          <FilterBar />
        </div>

        <LensSwitch />

        <ZoneTreemapWidget />
        <ZonesOverTime />
        <ZoneRanking />
      </div>
    </LensProvider>
  );
}
