"use client";

import { Frown } from "lucide-react";
import { useDissatisfiedVisitors } from "@/hooks/use-dissatisfied";
import { ZonePath } from "../zone-path";
import { WidgetCard } from "../widget-card";

/**
 * The dissatisfied visitors table — /api/v1/dissatisfied/visitors.
 * Every row is an anonymous face tag; no identities are ever shown.
 */
export function DissatisfiedList() {
  const query = useDissatisfiedVisitors();

  return (
    <WidgetCard
      title="Dissatisfied Visitors"
      description="Zones visited, time spent, and profile — sorted by unhappiest first"
      query={query}
      contentHeight={340}
    >
      {(data) => (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[680px] border-collapse text-[13px]">
            <caption className="sr-only">
              Anonymous dissatisfied visitors for the day under review
            </caption>
            <thead>
              <tr className="border-b text-left">
                <Th>Visitor</Th>
                <Th>Journey</Th>
                <Th className="text-right">Total</Th>
                <Th className="text-right">Time</Th>
                <Th>Profile</Th>
                <Th className="text-right">Sentiment</Th>
              </tr>
            </thead>
            <tbody>
              {data.visitors.map((visitor) => (
                <tr key={visitor.id} className="border-b last:border-b-0">
                  <td className="py-3 pr-3">
                    <div className="flex items-center gap-2.5">
                      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                        <Frown className="h-3.5 w-3.5" />
                      </span>
                      <span>
                        <span className="block font-medium tabular-nums">
                          {visitor.id}
                        </span>
                        <span className="block text-[10px] font-medium uppercase tracking-[0.08em] text-muted-foreground">
                          Anonymous
                        </span>
                      </span>
                    </div>
                  </td>
                  <td className="py-3 pr-3">
                    <ZonePath
                      stops={visitor.path.map((stop) => ({
                        zone: stop.zone,
                        detail: `${stop.minutes}m`,
                      }))}
                    />
                  </td>
                  <td className="py-3 pr-3 text-right tabular-nums">
                    {visitor.totalMinutes} min
                  </td>
                  <td className="py-3 pr-3 text-right tabular-nums">{visitor.time}</td>
                  <td className="py-3 pr-3 whitespace-nowrap text-muted-foreground">
                    {visitor.gender}, {visitor.ageBand}
                  </td>
                  <td className="py-3 text-right">
                    <span className="inline-flex h-9 w-9 items-center justify-center rounded-full border-2 border-primary/40 font-heading text-sm font-semibold tabular-nums text-primary">
                      {visitor.sentiment}
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

function Th({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <th
      className={`pb-2.5 pr-3 text-[10px] font-bold uppercase tracking-[0.1em] text-muted-foreground last:pr-0 ${className}`}
    >
      {children}
    </th>
  );
}
