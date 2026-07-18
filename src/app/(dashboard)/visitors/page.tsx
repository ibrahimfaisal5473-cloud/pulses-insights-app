import { PageHeader } from "@/components/dashboard/page-header";
import { FilterBar } from "@/components/dashboard/filter-bar";
import { DailyVisitors } from "@/components/dashboard/widgets/daily-visitors";
import { NewVsRepeat } from "@/components/dashboard/widgets/new-vs-repeat";
import { VisitorsByGender } from "@/components/dashboard/widgets/visitors-by-gender";
import { VisitorsByAge } from "@/components/dashboard/widgets/visitors-by-age";
import { OccupancyHeatmap } from "@/components/dashboard/widgets/occupancy-heatmap";
import { HappinessHeatmap } from "@/components/dashboard/widgets/happiness-heatmap";
import { WaitingTime } from "@/components/dashboard/widgets/waiting-time";

/** Visits & Happiness — daily volume, new vs repeat, the two heatmaps, and waits. */
export default function VisitorAnalyticsPage() {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <PageHeader
          title="Visitor Analytics"
          description="Visitor volume, mix, and waiting time over the selected range."
        />
        <FilterBar />
      </div>

      <DailyVisitors />
      <NewVsRepeat />
      <VisitorsByGender />
      <VisitorsByAge />

      <section className="grid gap-4 xl:grid-cols-2">
        <OccupancyHeatmap />
        <HappinessHeatmap />
      </section>

      <WaitingTime />
    </div>
  );
}
