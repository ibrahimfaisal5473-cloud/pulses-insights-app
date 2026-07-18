import { LensProvider, LensSwitch } from "@/components/dashboard/lens";
import { JourneyStatsRow } from "@/components/dashboard/widgets/journey-stats";
import { JourneyFlow } from "@/components/dashboard/widgets/journey-flow";
import { CommonJourneys } from "@/components/dashboard/widgets/common-journeys";
import { JourneyPanels } from "@/components/dashboard/widgets/journey-panels";
import { exportAttrs } from "@/lib/export/attrs";

/**
 * Visitor Journeys body — flow between phases, common paths, dwell, and
 * volume. Shared by the /journeys route and the full PDF report.
 */
export function JourneysSection() {
  return (
    <LensProvider>
      <div className="flex flex-col gap-6">
        <LensSwitch />

        <section
          className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4"
          {...exportAttrs("Journey Stats")}
        >
          <JourneyStatsRow />
        </section>

        <JourneyFlow />
        <CommonJourneys />
        <JourneyPanels />
      </div>
    </LensProvider>
  );
}
