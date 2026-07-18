"use client";

import { DwellByZone } from "./dwell-by-zone";
import { DwellSentiment } from "./dwell-sentiment";
import { JourneyVolume } from "./journey-volume";
import { ThresholdTracker } from "./threshold-tracker";
import { useLens } from "../lens";

/**
 * The lower half of the Journeys page. The two lenses don't just recolour the
 * same widgets — Happiness adds two of its own — so the arrangement itself is
 * lens-dependent and has to live in a Client Component.
 */
export function JourneyPanels() {
  const { lens } = useLens();

  if (lens === "happiness") {
    return (
      <>
        <section className="grid gap-4 lg:grid-cols-2">
          <DwellByZone />
          <DwellSentiment />
        </section>
        <JourneyVolume />
        <ThresholdTracker />
      </>
    );
  }

  return (
    <section className="grid gap-4 lg:grid-cols-2">
      <DwellByZone />
      <JourneyVolume />
    </section>
  );
}
