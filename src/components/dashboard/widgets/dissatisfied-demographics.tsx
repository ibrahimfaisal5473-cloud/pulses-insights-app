"use client";

import { useDissatisfiedDemographics } from "@/hooks/use-dissatisfied";
import { RankedBars } from "@/components/charts/ranked-bars";
import { chart } from "@/config/chart";
import { WidgetCard } from "../widget-card";

/** Dissatisfied visitors by gender and age — /api/v1/dissatisfied/demographics. */
export function DissatisfiedDemographics() {
  const query = useDissatisfiedDemographics();

  return (
    <WidgetCard
      title="Dissatisfied by Demographic"
      description="Gender and age band of dissatisfied visitors"
      query={query}
      contentHeight={260}
    >
      {(data) => (
        <div className="flex flex-col gap-5">
          <section>
            <h4 className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              By gender
            </h4>
            <RankedBars
              labelWidth="88px"
              rows={data.byGender.map((g) => ({
                id: g.name,
                label: g.name,
                value: g.count,
                display: String(g.count),
                color: chart.series[1],
              }))}
            />
          </section>

          <section>
            <h4 className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              By age band
            </h4>
            <RankedBars
              labelWidth="88px"
              rows={data.byAge.map((a) => ({
                id: a.band,
                label: a.band,
                value: a.count,
                display: String(a.count),
                color: chart.series[3],
              }))}
            />
          </section>
        </div>
      )}
    </WidgetCard>
  );
}
