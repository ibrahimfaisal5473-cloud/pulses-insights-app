"use client";

import { useState } from "react";
import type { JourneyGroupBy, JourneyTimeOfDay } from "@/types";
import { useJourneyFlow } from "@/hooks/use-journeys";
import { JourneySankey } from "@/components/charts/journey-sankey";
import { chart } from "@/config/chart";
import { sentimentColor } from "@/lib/sentiment";
import { cn, formatNumber } from "@/lib/utils";
import { WidgetCard } from "../widget-card";
import { useLens } from "../lens";

/**
 * Visitor flow between phases or zones — /api/v1/journey/flow.
 *
 * Owns the view controls (grouping, trends/details, time of day) and feeds them
 * to the endpoint; the Sankey below stays presentational. Lens-aware: the
 * Happiness lens recolours nodes and ribbons by sentiment.
 */

type View = "trends" | "details";

const GROUPINGS: { value: JourneyGroupBy; label: string }[] = [
  { value: "type", label: "By Type" },
  { value: "zone", label: "By Zone" },
];

const VIEWS: { value: View; label: string }[] = [
  { value: "trends", label: "Show Trends" },
  { value: "details", label: "Show Details" },
];

const TIMES: { value: JourneyTimeOfDay; label: string }[] = [
  { value: "all", label: "All day" },
  { value: "morning", label: "Morning" },
  { value: "afternoon", label: "Afternoon" },
  { value: "evening", label: "Evening" },
];

export function JourneyFlow() {
  const { lens } = useLens();
  const [groupBy, setGroupBy] = useState<JourneyGroupBy>("type");
  const [view, setView] = useState<View>("trends");
  const [timeOfDay, setTimeOfDay] = useState<JourneyTimeOfDay>("all");

  const query = useJourneyFlow({ groupBy, timeOfDay });
  const isHappiness = lens === "happiness";

  return (
    <WidgetCard
      title="Visitor Flow Between Zones"
      description={
        groupBy === "zone"
          ? "How visitors move zone to zone, stop by stop — ribbon width is proportional to footfall"
          : "How visitors move from phase to phase — ribbon width is proportional to footfall"
      }
      query={query}
      contentHeight={400}
    >
      {(data) => (
        <div className="flex flex-col gap-5">
          <div className="flex flex-wrap items-center justify-end gap-2">
            <Toggle options={GROUPINGS} value={groupBy} onChange={setGroupBy} variant="solid" />
            <Toggle options={VIEWS} value={view} onChange={setView} variant="solid" />
            <Toggle options={TIMES} value={timeOfDay} onChange={setTimeOfDay} variant="subtle" />
          </div>

          {view === "trends" ? (
            <JourneySankey data={data} lens={lens} height={groupBy === "zone" ? 400 : 340} />
          ) : (
            <FlowTable data={data} isHappiness={isHappiness} />
          )}

          <p className="border-t pt-3 text-xs text-muted-foreground">
            Showing{" "}
            <span className="font-semibold text-foreground">
              {groupBy === "zone" ? "highest-volume movements" : "highest-volume phase transitions"}
            </span>
            {data.hiddenFlows > 0 && ` · ${formatNumber(data.hiddenFlows)} minor flows hidden`}
            {" · "}
            {isHappiness ? (
              <>Colour shows sentiment — switch the lens back to Visits for footfall colours.</>
            ) : (
              <>
                Switch the lens to{" "}
                <span className="font-semibold text-foreground">Happiness</span> to colour by
                sentiment.
              </>
            )}
          </p>
        </div>
      )}
    </WidgetCard>
  );
}

/** Pill switch. `solid` reads as a primary control; `subtle` sits quieter beside it. */
function Toggle<T extends string>({
  options,
  value,
  onChange,
  variant,
}: {
  options: { value: T; label: string }[];
  value: T;
  onChange: (value: T) => void;
  variant: "solid" | "subtle";
}) {
  return (
    <div className="inline-flex rounded-full border bg-muted/60 p-[3px]">
      {options.map((option) => {
        const active = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            aria-pressed={active}
            onClick={() => onChange(option.value)}
            className={cn(
              "rounded-full px-3.5 py-1 text-xs transition-colors",
              active && variant === "solid" && "bg-primary text-primary-foreground",
              active && variant === "subtle" && "bg-background font-medium text-foreground shadow-sm",
              !active && "text-muted-foreground hover:text-foreground",
            )}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}

/** Every flow as a row — including detail the diagram trades away for legibility. */
function FlowTable({
  data,
  isHappiness,
}: {
  data: Parameters<typeof JourneySankey>[0]["data"];
  isHappiness: boolean;
}) {
  const names = new Map(data.nodes.map((n) => [n.id, n.name]));
  const rows = [...data.links].sort((a, b) => b.value - a.value);

  if (rows.length === 0) {
    return (
      <p className="py-12 text-center text-sm text-muted-foreground">
        No visitor flow for this selection.
      </p>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b text-[10px] tracking-[0.1em] text-muted-foreground uppercase">
            <th className="py-2 text-left font-semibold">From</th>
            <th className="py-2 text-left font-semibold">To</th>
            <th className="py-2 text-right font-semibold">Visitors</th>
            <th className="py-2 text-right font-semibold">% of source</th>
            <th className="py-2 text-right font-semibold">Sentiment</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((link) => (
            <tr key={link.id} className="border-b last:border-0">
              <td className="py-2">{names.get(link.source)}</td>
              <td className="py-2">{names.get(link.target)}</td>
              <td className="py-2 text-right font-semibold tabular-nums">
                {formatNumber(link.value)}
              </td>
              <td className="py-2 text-right tabular-nums text-muted-foreground">
                {link.sharePct}%
              </td>
              <td className="py-2 text-right">
                <span
                  className="font-semibold tabular-nums"
                  style={{
                    color: isHappiness ? sentimentColor(link.happiness) : chart.happiness,
                  }}
                >
                  {link.happiness.toFixed(1)}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
