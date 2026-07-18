"use client";

import { useUnhappyJourneys } from "@/hooks/use-dissatisfied";
import { ZonePath } from "../zone-path";
import { WidgetCard } from "../widget-card";

/** Recurring low-sentiment paths — /api/v1/dissatisfied/journeys. */
export function UnhappyJourneys() {
  const query = useUnhappyJourneys();

  return (
    <WidgetCard
      title="Most Unhappy Journeys"
      description="Recurring low-sentiment paths"
      query={query}
      contentHeight={220}
    >
      {(data) => (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[420px] border-collapse text-[13px]">
            <thead>
              <tr className="border-b text-left">
                <th className="pb-2.5 text-[10px] font-bold uppercase tracking-[0.1em] text-muted-foreground">
                  Journey
                </th>
                <th className="pb-2.5 text-right text-[10px] font-bold uppercase tracking-[0.1em] text-muted-foreground">
                  N
                </th>
                <th className="pb-2.5 text-right text-[10px] font-bold uppercase tracking-[0.1em] text-muted-foreground">
                  Avg time
                </th>
                <th className="pb-2.5 text-right text-[10px] font-bold uppercase tracking-[0.1em] text-muted-foreground">
                  Sentiment
                </th>
              </tr>
            </thead>
            <tbody>
              {data.journeys.map((journey) => (
                <tr key={journey.id} className="border-b last:border-b-0">
                  <td className="py-3 pr-3">
                    <ZonePath stops={journey.path.map((zone) => ({ zone }))} />
                  </td>
                  <td className="py-3 pr-3 text-right tabular-nums">{journey.count}</td>
                  <td className="py-3 pr-3 text-right tabular-nums">
                    {journey.avgMinutes} min
                  </td>
                  <td className="py-3 text-right">
                    <span className="inline-flex items-center rounded-full border-2 border-primary/40 px-2.5 py-0.5 font-heading text-sm font-semibold tabular-nums text-primary">
                      {journey.sentiment.toFixed(1)}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </WidgetCard>
  );
}
