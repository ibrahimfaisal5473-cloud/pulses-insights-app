import { PageHeader } from "@/components/dashboard/page-header";
import { FilterBar } from "@/components/dashboard/filter-bar";
import { LensProvider, LensSwitch } from "@/components/dashboard/lens";
import { JourneyStatsRow } from "@/components/dashboard/widgets/journey-stats";
import { JourneyFlow } from "@/components/dashboard/widgets/journey-flow";
import { CommonJourneys } from "@/components/dashboard/widgets/common-journeys";
import { JourneyPanels } from "@/components/dashboard/widgets/journey-panels";

/** Visitor Journeys — flow between phases, common paths, dwell, and volume. */
export default function VisitorJourneysPage() {
  return (
    <LensProvider>
      <div className="flex flex-col gap-6">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <PageHeader
            title="Visitor Journeys"
            description="How visitors move between zones and where they dwell."
          />
          <FilterBar />
        </div>

        <LensSwitch />

        <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <JourneyStatsRow />
        </section>

        <JourneyFlow />
        <CommonJourneys />
        <JourneyPanels />
      </div>
    </LensProvider>
  );
}
