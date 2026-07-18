import { LensProvider, LensSwitch } from "@/components/dashboard/lens";
import { ZoneTreemapWidget } from "@/components/dashboard/widgets/zone-treemap-widget";
import { ZonesOverTime } from "@/components/dashboard/widgets/zones-over-time";
import { ZoneRanking } from "@/components/dashboard/widgets/zone-ranking";

/**
 * Zone Analytics body — traffic by zone, over time, and the footfall/happiness
 * ranking. Shared by the /zones route and the full PDF report.
 */
export function ZonesSection() {
  return (
    <LensProvider>
      <div className="flex flex-col gap-6">
        <LensSwitch />

        <ZoneTreemapWidget />
        <ZonesOverTime />
        <ZoneRanking />
      </div>
    </LensProvider>
  );
}
