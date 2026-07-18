import { LensProvider, LensSwitch } from "@/components/dashboard/lens";
import { UniquePeople } from "@/components/dashboard/widgets/unique-people";
import { Footfall } from "@/components/dashboard/widgets/footfall";
import { VisitorMood } from "@/components/dashboard/widgets/visitor-mood";
import { InsightCards } from "@/components/dashboard/widgets/insight-cards";
import { HappinessTrend } from "@/components/dashboard/widgets/happiness-trend";
import { GenderDistribution } from "@/components/dashboard/widgets/gender-distribution";
import { AgeDistribution } from "@/components/dashboard/widgets/age-distribution";
import { ZoneRanking } from "@/components/dashboard/widgets/zone-ranking";
import { exportAttrs } from "@/lib/export/attrs";

/**
 * Overview body — headline stats, generated insight callouts, happiness over
 * time, demographic splits, and the zone ranking. Every widget fetches from
 * its own endpoint, so one slow or failing endpoint never blocks the rest.
 *
 * Shared by the /  route and the full PDF report so the two can't drift.
 * The rows of stat tiles are tagged for export as single blocks, since they
 * read as one unit and don't go through WidgetCard.
 */
export function OverviewSection() {
  return (
    <LensProvider>
      <div className="flex flex-col gap-6">
        <LensSwitch />

        <section
          className="grid gap-4 lg:grid-cols-[1.5fr_1fr_0.9fr]"
          {...exportAttrs("Key Metrics")}
        >
          <UniquePeople />
          <Footfall />
          <VisitorMood />
        </section>

        <section className="grid gap-4 lg:grid-cols-3" {...exportAttrs("Insights")}>
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
