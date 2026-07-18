"use client";

import { useEffect, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { OverviewSection } from "@/components/dashboard/sections/overview-section";
import { VisitorsSection } from "@/components/dashboard/sections/visitors-section";
import { ZonesSection } from "@/components/dashboard/sections/zones-section";
import { JourneysSection } from "@/components/dashboard/sections/journeys-section";
import { DissatisfiedSection } from "@/components/dashboard/sections/dissatisfied-section";
import {
  buildReportPdf,
  type ReportMeta,
  type ReportProgress,
  type ReportSection,
} from "@/lib/export/report";

/**
 * Off-screen renderer for the full PDF report.
 *
 * The five dashboard sections live on separate routes, so their widgets aren't
 * in the DOM at the same time. Mounting every section into a hidden container
 * lets one capture pass cover all of them without navigating the user around.
 *
 * The container is positioned off-screen rather than `display: none` — hidden
 * elements have no layout, so Recharts' ResponsiveContainer would measure zero
 * and every chart would capture blank.
 */

/** Fixed width so the report layout doesn't depend on the user's window size. */
const REPORT_WIDTH = 1280;

/** Recharts' default enter animation is 1500ms; capture after it settles. */
const ANIMATION_SETTLE_MS = 1700;

/** Ceiling on waiting for widget queries, so a dead endpoint can't hang the export. */
const FETCH_TIMEOUT_MS = 30_000;

const SECTIONS = [
  { title: "Overview", Component: OverviewSection },
  { title: "Visitor Analytics", Component: VisitorsSection },
  { title: "Zone Analytics", Component: ZonesSection },
  { title: "Visitor Journeys", Component: JourneysSection },
  { title: "Dissatisfied Visitors", Component: DissatisfiedSection },
] as const;

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export function ReportRenderer({
  meta,
  onProgress,
  onDone,
}: {
  meta: ReportMeta;
  onProgress: (progress: ReportProgress) => void;
  /** Called on success and on failure alike, so the trigger can always reset. */
  onDone: (error?: unknown) => void;
}) {
  const queryClient = useQueryClient();
  const sectionRefs = useRef<(HTMLDivElement | null)[]>([]);

  useEffect(() => {
    // Strict Mode runs effects twice in dev: the first pass is cancelled by
    // its own cleanup and the second does the work. Guarding with a ref
    // instead would leave the cancelled first pass as the only pass, and the
    // export would hang forever.
    let cancelled = false;

    (async () => {
      try {
        // Let the freshly mounted sections kick off their queries.
        await delay(300);
        if (cancelled) return;

        const deadline = Date.now() + FETCH_TIMEOUT_MS;
        while (queryClient.isFetching() > 0 && Date.now() < deadline) {
          await delay(120);
          if (cancelled) return;
        }

        await delay(ANIMATION_SETTLE_MS);
        if (cancelled) return;

        const sections: ReportSection[] = SECTIONS.flatMap((section, i) => {
          const container = sectionRefs.current[i];
          return container ? [{ title: section.title, container }] : [];
        });

        await buildReportPdf(sections, meta, onProgress);
        if (!cancelled) onDone();
      } catch (error) {
        if (!cancelled) onDone(error);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [queryClient, meta, onProgress, onDone]);

  return (
    <div
      aria-hidden
      className="pointer-events-none fixed top-0 bg-background p-6"
      style={{ left: -(REPORT_WIDTH + 200), width: REPORT_WIDTH }}
    >
      {SECTIONS.map((section, i) => (
        <div
          key={section.title}
          ref={(node) => {
            sectionRefs.current[i] = node;
          }}
        >
          <section.Component />
        </div>
      ))}
    </div>
  );
}
