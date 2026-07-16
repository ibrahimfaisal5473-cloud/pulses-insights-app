import { PageHeader } from "@/components/dashboard/page-header";
import { LensProvider, LensSwitch } from "@/components/dashboard/lens";
import { UniquePeople } from "@/components/dashboard/widgets/unique-people";
import { Footfall } from "@/components/dashboard/widgets/footfall";
import { VisitorMood } from "@/components/dashboard/widgets/visitor-mood";
import { InsightCards } from "@/components/dashboard/widgets/insight-cards";
import { HappinessTrend } from "@/components/dashboard/widgets/happiness-trend";
import { GenderDistribution } from "@/components/dashboard/widgets/gender-distribution";
import { AgeDistribution } from "@/components/dashboard/widgets/age-distribution";
import { ZoneRanking } from "@/components/dashboard/widgets/zone-ranking";

/**
 * Overview — mirrors the Insights reference layout: headline stats, generated
 * insight callouts, happiness over time, demographic splits, and the zone
 * ranking. Every widget fetches independently from its own endpoint, so one
 * slow or failing endpoint never blocks the rest of the page.
 *
 * The lens row swaps the demographic splits and the zone ranking between
 * footfall and sentiment.
 */
export default function OverviewPage() {
  return (
    <LensProvider>
      <div className="flex flex-col gap-6">
        <PageHeader
          title="Overview"
          description="Key visitor metrics for the last 30 days."
        />

        <LensSwitch />

        <section className="grid gap-4 lg:grid-cols-[1.5fr_1fr_0.9fr]">
          <UniquePeople />
          <Footfall />
          <VisitorMood />
        </section>

        <section className="grid gap-4 lg:grid-cols-3">
          <InsightCards />
        </section>

        <HappinessTrend />

        <section className="grid gap-4 lg:grid-cols-2">
          <GenderDistribution />
          <AgeDistribution />
        </section>

        <ZoneRanking />
      </div>
    </LensProvider>
  );
}
