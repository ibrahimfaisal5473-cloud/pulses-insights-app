import { chart } from "@/config/chart";

/**
 * A visit path rendered as zone chips joined by arrows.
 * Shared by "Most Common Journeys" and the dissatisfied-visitor list.
 *
 * `dotColor` overrides the per-stop palette — the Happiness lens uses it to
 * colour every chip by the path's sentiment instead.
 */
export function ZonePath({
  stops,
  dotColor,
}: {
  stops: { zone: string; detail?: string }[];
  dotColor?: string;
}) {
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {stops.map((stop, i) => (
        <span key={`${stop.zone}-${i}`} className="flex items-center gap-1.5">
          {i > 0 && <span className="text-xs text-muted-foreground">→</span>}
          <span className="inline-flex items-center gap-1.5 rounded-md border bg-muted/40 px-2 py-1 text-xs">
            <span
              className="h-1.5 w-1.5 rounded-full"
              style={{ background: dotColor ?? chart.series[i % chart.series.length] }}
            />
            {stop.zone}
            {stop.detail && (
              <span className="text-muted-foreground">{stop.detail}</span>
            )}
          </span>
        </span>
      ))}
    </div>
  );
}
