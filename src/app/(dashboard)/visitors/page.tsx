import { PageHeader } from "@/components/dashboard/page-header";
import { VisitorTrend } from "@/components/dashboard/widgets/visitor-trend";
import { OccupancyHeatmap } from "@/components/dashboard/widgets/occupancy-heatmap";

export default function VisitorAnalyticsPage() {
  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Visitor Analytics"
        description="Visitor counts and trends over time."
      />

      <VisitorTrend />
      <OccupancyHeatmap />
    </div>
  );
}
