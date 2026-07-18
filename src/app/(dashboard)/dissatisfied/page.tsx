import { PageHeader } from "@/components/dashboard/page-header";
import { FilterBar } from "@/components/dashboard/filter-bar";
import { DissatisfiedSummaryBanner } from "@/components/dashboard/widgets/dissatisfied-summary";
import { DissatisfiedList } from "@/components/dashboard/widgets/dissatisfied-list";
import { UnhappyJourneys } from "@/components/dashboard/widgets/unhappy-journeys";
import { DissatisfiedByHour } from "@/components/dashboard/widgets/dissatisfied-by-hour";
import { DissatisfiedDemographics } from "@/components/dashboard/widgets/dissatisfied-demographics";
import { RepeatSentiment } from "@/components/dashboard/widgets/repeat-sentiment";

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
        <FilterBar />
      </div>

      <DissatisfiedSummaryBanner />
      <DissatisfiedList />

      <section className="grid gap-4 lg:grid-cols-2">
        <UnhappyJourneys />
        <DissatisfiedByHour />
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <DissatisfiedDemographics />
        <RepeatSentiment />
      </section>
    </div>
  );
}
