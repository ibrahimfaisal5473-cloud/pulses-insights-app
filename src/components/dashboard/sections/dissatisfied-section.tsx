import { DissatisfiedSummaryBanner } from "@/components/dashboard/widgets/dissatisfied-summary";
import { DissatisfiedList } from "@/components/dashboard/widgets/dissatisfied-list";
import { UnhappyJourneys } from "@/components/dashboard/widgets/unhappy-journeys";
import { DissatisfiedByHour } from "@/components/dashboard/widgets/dissatisfied-by-hour";
import { DissatisfiedDemographics } from "@/components/dashboard/widgets/dissatisfied-demographics";
import { RepeatSentiment } from "@/components/dashboard/widgets/repeat-sentiment";
import { exportAttrs } from "@/lib/export/attrs";

/**
 * Dissatisfied Visitors body — the daily review queue. Everything here is
 * anonymous (hashed face tags only), so the team can act on the floor without
 * identifying anyone. Shared by the /dissatisfied route and the PDF report.
 */
export function DissatisfiedSection() {
  return (
    <div className="flex flex-col gap-6">
      <div {...exportAttrs("Daily Review Summary")}>
        <DissatisfiedSummaryBanner />
      </div>

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
