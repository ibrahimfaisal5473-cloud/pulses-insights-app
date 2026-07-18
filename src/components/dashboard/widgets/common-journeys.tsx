"use client";

import { useCommonJourneys } from "@/hooks/use-journeys";
import { ZonePath } from "../zone-path";
import { sentimentColor } from "@/lib/sentiment";
import { formatNumber } from "@/lib/utils";
import { WidgetCard } from "../widget-card";
import { useLens } from "../lens";

/**
 * Most common end-to-end paths — /api/v1/journey/common. Lens-aware: the
 * Happiness lens colours each path by its sentiment and scores it out of 100.
 */
export function CommonJourneys() {
  const { lens } = useLens();
  const query = useCommonJourneys();
  const isHappiness = lens === "happiness";

  return (
    <WidgetCard
      title="Most Common Journeys"
      description={
        isHappiness
          ? "Top end-to-end paths ranked by share · colour = sentiment along the path"
          : "Top end-to-end paths ranked by share of all visitor journeys"
      }
      query={query}
      contentHeight={320}
    >
      {(data) => {
        const max = Math.max(...data.journeys.map((j) => j.sharePct), 1);

        return (
          <ol className="flex flex-col">
            {data.journeys.map((journey, i) => {
              const color = sentimentColor(journey.happiness);

              return (
                <li
                  key={journey.id}
                  className="grid grid-cols-[28px_1fr_auto] items-center gap-4 border-b py-3 last:border-b-0"
                >
                  <span className="font-heading text-sm text-muted-foreground tabular-nums">
                    {String(i + 1).padStart(2, "0")}
                  </span>

                  <div className="flex flex-col gap-2">
                    <ZonePath
                      stops={journey.path.map((zone) => ({ zone }))}
                      dotColor={isHappiness ? color : undefined}
                    />
                    <div className="h-1 w-24 overflow-hidden rounded-full bg-muted">
                      <div
                        className="h-full rounded-full"
                        style={{
                          width: `${(journey.sharePct / max) * 100}%`,
                          background: isHappiness ? color : "var(--primary)",
                        }}
                      />
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <span className="font-heading text-base font-semibold tabular-nums">
                        {journey.sharePct.toFixed(1)}%
                      </span>
                      <span className="block text-[11px] text-muted-foreground">
                        {formatNumber(journey.visits)} · {journey.avgMinutes} min avg
                      </span>
                    </div>

                    {isHappiness && (
                      <span
                        className="inline-flex h-7 min-w-9 items-center justify-center rounded-full border px-2 text-xs font-semibold tabular-nums"
                        style={{ borderColor: color, color }}
                        title={`Average sentiment along this path: ${journey.happiness.toFixed(1)}/100`}
                      >
                        {Math.round(journey.happiness)}
                      </span>
                    )}
                  </div>
                </li>
              );
            })}
          </ol>
        );
      }}
    </WidgetCard>
  );
}
