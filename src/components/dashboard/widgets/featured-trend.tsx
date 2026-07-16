"use client";

import { useLens } from "../lens";
import { VisitorTrend } from "./visitor-trend";
import { HappinessTrend } from "./happiness-trend";

/**
 * The lens-driven headline chart: footfall under the Visits lens, sentiment
 * under the Happiness lens — the same behaviour as the Emirates reference.
 */
export function FeaturedTrend() {
  const { lens } = useLens();
  return lens === "happiness" ? <HappinessTrend /> : <VisitorTrend />;
}
