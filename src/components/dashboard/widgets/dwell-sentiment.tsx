"use client";

import { useDwellSentiment } from "@/hooks/use-journeys";
import { BarChart } from "@/components/charts/bar-chart";
import { chart } from "@/config/chart";
import { sentimentColor } from "@/lib/sentiment";
import { formatNumber } from "@/lib/utils";
import { WidgetCard } from "../widget-card";

/**
 * Sentiment bucketed by visit length — /api/v1/journey/dwell-sentiment.
 * Happiness-lens only; the Visits lens has nothing to say about sentiment.
 */
export function DwellSentiment() {
  const query = useDwellSentiment();

  return (
    <WidgetCard
      title="Dwell Time vs Sentiment"
      description="Does a longer visit lower sentiment?"
      query={query}
      contentHeight={260}
    >
      {(data) => {
        const worst = data.buckets.find((b) => b.id === data.worstBucketId);
        const best = data.buckets.reduce(
          (high, b) => (b.happiness > high.happiness ? b : high),
          data.buckets[0],
        );
        const drop = best && worst ? best.happiness - worst.happiness : 0;

        return (
          <div className="flex flex-col gap-3">
            <BarChart
              height={210}
              data={data.buckets.map((b) => ({ ...b }))}
              xKey="label"
              yDomain={[55, 95]}
              showLabels
              highlightX={worst?.label}
              valueFormatter={(v) => v.toFixed(1)}
              cellColor={(row) => sentimentColor(Number(row.happiness))}
              series={[{ key: "happiness", name: "Sentiment", color: chart.happiness }]}
            />
            <p className="text-xs text-muted-foreground">
              {drop < 1 ? (
                <>
                  Barely — sentiment falls just{" "}
                  <span className="font-medium text-foreground">{drop.toFixed(1)} points</span>{" "}
                  between the shortest and longest visits.
                </>
              ) : (
                <>
                  Visits lasting{" "}
                  <span className="font-medium text-foreground">{worst?.label}</span> score{" "}
                  <span className="font-medium text-foreground">{drop.toFixed(1)} points</span>{" "}
                  lower than the happiest bucket.
                </>
              )}{" "}
              {formatNumber(worst?.visits ?? 0)} visits in that bucket.
            </p>
          </div>
        );
      }}
    </WidgetCard>
  );
}
