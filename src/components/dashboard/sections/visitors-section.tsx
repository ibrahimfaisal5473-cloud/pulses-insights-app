import { DailyVisitors } from "@/components/dashboard/widgets/daily-visitors";
import { NewVsRepeat } from "@/components/dashboard/widgets/new-vs-repeat";
import { VisitorsByGender } from "@/components/dashboard/widgets/visitors-by-gender";
import { VisitorsByAge } from "@/components/dashboard/widgets/visitors-by-age";
import { OccupancyHeatmap } from "@/components/dashboard/widgets/occupancy-heatmap";
import { HappinessHeatmap } from "@/components/dashboard/widgets/happiness-heatmap";
import { WaitingTime } from "@/components/dashboard/widgets/waiting-time";

/**
 * Visits & Happiness body — daily volume, new vs repeat, the two heatmaps,
 * and waiting time. Shared by the /visitors route and the full PDF report.
 */
export function VisitorsSection() {
  return (
    <div className="flex flex-col gap-6">
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
