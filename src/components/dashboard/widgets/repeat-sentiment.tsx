"use client";

import { Minus, TrendingDown, TrendingUp } from "lucide-react";
import type { RepeatSentimentVisitor } from "@/types";
import { useRepeatSentiment } from "@/hooks/use-dissatisfied";
import { formatShortDate } from "@/lib/utils";
import { WidgetCard } from "../widget-card";

/**
 * Sentiment across repeat visits for the same anonymous tag —
 * /api/v1/dissatisfied/repeat-sentiment.
 */
export function RepeatSentiment() {
  const query = useRepeatSentiment();

  return (
    <WidgetCard
      title="Repeat-Visit Sentiment"
      description="Anonymous tags seen multiple times — did their experience improve or worsen?"
      query={query}
      contentHeight={260}
    >
      {(data) => (
        <div className="flex flex-col gap-5">
          {data.visitors.map((visitor) => (
            <VisitorChain key={visitor.id} visitor={visitor} />
          ))}
        </div>
      )}
    </WidgetCard>
  );
}

const TRENDS = {
  improving: { Icon: TrendingUp, label: "Improving", className: "text-[#4E7A2E]" },
  worsening: { Icon: TrendingDown, label: "Worsening", className: "text-primary" },
  stable: { Icon: Minus, label: "No change", className: "text-muted-foreground" },
} as const;

function VisitorChain({ visitor }: { visitor: RepeatSentimentVisitor }) {
  const { Icon, label, className } = TRENDS[visitor.trend];

  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div className="flex min-w-0 flex-wrap items-center gap-2">
        <span className="mr-1 text-xs font-medium">{visitor.id}</span>
        {visitor.points.map((point, i) => (
          <span key={point.date} className="flex items-center gap-2">
            {i > 0 && <span className="text-xs text-muted-foreground">→</span>}
            <span
              title={formatShortDate(`${point.date}T00:00:00Z`)}
              className="flex h-8 w-8 items-center justify-center rounded-full border text-[11px] tabular-nums"
            >
              {point.score}
            </span>
          </span>
        ))}
      </div>

      <span className={`flex items-center gap-1.5 text-xs font-medium ${className}`}>
        <Icon className="h-3.5 w-3.5" />
        {label}
      </span>
    </div>
  );
}
