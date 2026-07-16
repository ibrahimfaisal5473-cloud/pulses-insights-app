import { PageHeader } from "@/components/dashboard/page-header";
import { LensProvider, LensSwitch } from "@/components/dashboard/lens";
import { VisitorKpis } from "@/components/dashboard/widgets/visitor-kpis";
import { MoodKpi } from "@/components/dashboard/widgets/mood-kpi";
import { FeaturedTrend } from "@/components/dashboard/widgets/featured-trend";
import { OccupancyHeatmap } from "@/components/dashboard/widgets/occupancy-heatmap";
import { GenderDistribution } from "@/components/dashboard/widgets/gender-distribution";
import { AgeDistribution } from "@/components/dashboard/widgets/age-distribution";

/**
 * Overview — every widget fetches independently from its own endpoint
 * (loading/error states are per-widget, so one slow endpoint never blocks
 * the rest of the page). The lens row at the top switches the featured
 * chart between footfall and sentiment.
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

        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
          <VisitorKpis />
          <MoodKpi />
        </section>

        <section className="grid gap-4 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <FeaturedTrend />
          </div>
          <GenderDistribution />
        </section>

        <section className="grid gap-4 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <OccupancyHeatmap />
          </div>
          <AgeDistribution />
        </section>
      </div>
    </LensProvider>
  );
}
