"use client";

import {
  useMemo,
  useState,
  type FocusEvent as ReactFocusEvent,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
} from "react";
import type { JourneyFlowNode, JourneyFlowResponse } from "@/types";
import type { Lens } from "@/components/dashboard/lens";
import { chart } from "@/config/chart";
import { sentimentColor } from "@/lib/sentiment";
import { formatNumber } from "@/lib/utils";

/**
 * Visitor flow, drawn as a Sankey.
 *
 * Hand-rolled SVG (node bars + cubic-bezier ribbons) rather than a charting
 * dependency: the layout is a simple column stack, and the hover behaviour —
 * dim everything unrelated, anchor a tooltip to the cursor, narrate the
 * selection in the caption below — is easier to own outright than to bend a
 * library into.
 */

const W = 1000;
const NODE_W = 12;
const NODE_GAP = 10;
const PAD_Y = 14;
/** Room either side for the outer columns' text labels. */
const PAD_LEFT = 150;
const PAD_RIGHT = 150;
/** Nothing thinner than this is clickable, however small its value. */
const MIN_BAND = 1.5;
/** Vertical room a node label needs before the next one may be drawn. */
const LABEL_GAP = 34;

/** `x`/`y` are relative to the chart box; `flip` when the tooltip would overflow right. */
type Hover = {
  kind: "node" | "link";
  id: string;
  x: number;
  y: number;
  flip: boolean;
};

type Placed = JourneyFlowNode & { x: number; y: number; h: number; labelled: boolean };
type Band = { id: string; source: Placed; target: Placed; value: number; sharePct: number; happiness: number; y1: number; y2: number; h: number };

export function JourneySankey({
  data,
  lens = "visits",
  height = 340,
}: {
  data: JourneyFlowResponse;
  lens?: Lens;
  height?: number;
}) {
  const [hover, setHover] = useState<Hover | null>(null);
  const isHappiness = lens === "happiness";

  const { nodes, bands } = useLayout(data, height);

  const colorFor = (node: Placed) =>
    isHappiness ? sentimentColor(node.happiness) : chart.series[node.column % chart.series.length];

  // What stays lit while hovering: the hovered item plus whatever touches it.
  const lit = useMemo(() => {
    if (!hover) return null;
    if (hover.kind === "node") {
      const touching = bands.filter((b) => b.source.id === hover.id || b.target.id === hover.id);
      return {
        nodes: new Set([hover.id, ...touching.flatMap((b) => [b.source.id, b.target.id])]),
        links: new Set(touching.map((b) => b.id)),
      };
    }
    const band = bands.find((b) => b.id === hover.id);
    return {
      nodes: new Set(band ? [band.source.id, band.target.id] : []),
      links: new Set(band ? [band.id] : []),
    };
  }, [hover, bands]);

  const dim = (isLit: boolean) => (lit && !isLit ? 0.08 : 1);

  const hoveredNode = hover?.kind === "node" ? nodes.find((n) => n.id === hover.id) : undefined;
  const hoveredBand = hover?.kind === "link" ? bands.find((b) => b.id === hover.id) : undefined;

  const place = (
    target: Element,
    clientX: number,
    clientY: number,
    next: Pick<Hover, "kind" | "id">,
  ) => {
    const box = target.closest("[data-sankey]")?.getBoundingClientRect();
    const x = clientX - (box?.left ?? 0);
    setHover({ ...next, x, y: clientY - (box?.top ?? 0), flip: x > (box?.width ?? W) * 0.6 });
  };

  /** Cursor position, relative to the chart box (not the scaled viewBox). */
  const track = (event: ReactPointerEvent, next: Pick<Hover, "kind" | "id">) =>
    place(event.currentTarget, event.clientX, event.clientY, next);

  /** Keyboard equivalent: anchor to the focused shape rather than the cursor. */
  const focus = (event: ReactFocusEvent<SVGElement>, next: Pick<Hover, "kind" | "id">) => {
    const shape = event.currentTarget.getBoundingClientRect();
    place(event.currentTarget, shape.left + shape.width / 2, shape.top, next);
  };

  if (nodes.length === 0) {
    return (
      <p className="py-12 text-center text-sm text-muted-foreground">
        No visitor flow for this selection.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <div data-sankey className="relative" onPointerLeave={() => setHover(null)}>
        <ColumnHeaders columns={data.columns} />

        <svg
          width="100%"
          viewBox={`0 0 ${W} ${height}`}
          role="img"
          aria-label={
            data.groupBy === "zone"
              ? "Visitor flow between zones, stop by stop"
              : "Visitor flow between journey phases"
          }
          className="block touch-none"
        >
          {bands.map((band) => (
            <path
              key={band.id}
              d={ribbon(band)}
              fill={colorFor(band.source)}
              opacity={0.3 * dim(lit?.links.has(band.id) ?? false)}
              className="cursor-pointer transition-opacity duration-150 outline-none focus-visible:opacity-100"
              tabIndex={0}
              role="button"
              aria-label={`${band.source.name} to ${band.target.name}: ${formatNumber(band.value)} visitors, ${band.sharePct}% of ${band.source.name}`}
              onPointerMove={(e) => track(e, { kind: "link", id: band.id })}
              onFocus={(e) => focus(e, { kind: "link", id: band.id })}
              onBlur={() => setHover(null)}
            />
          ))}

          {nodes.map((node) => (
            <g key={node.id}>
              <rect
                x={node.x - NODE_W / 2}
                y={node.y}
                width={NODE_W}
                height={node.h}
                rx={2}
                fill={colorFor(node)}
                opacity={dim(lit?.nodes.has(node.id) ?? false)}
                className="cursor-pointer transition-opacity duration-150 outline-none focus-visible:opacity-100"
                tabIndex={0}
                role="button"
                aria-label={`${node.name}: ${formatNumber(node.visitors)} visitors, ${formatNumber(node.fromFunnel)} from the funnel, ${formatNumber(node.startedHere)} started here`}
                onPointerMove={(e) => track(e, { kind: "node", id: node.id })}
                onFocus={(e) => focus(e, { kind: "node", id: node.id })}
                onBlur={() => setHover(null)}
              />
              <NodeLabel
                node={node}
                lastColumn={data.columns.length - 1}
                dimmed={lit !== null && !lit.nodes.has(node.id)}
              />
            </g>
          ))}
        </svg>

        {hover && (hoveredNode || hoveredBand) && (
          <Tooltip x={hover.x} y={hover.y} flip={hover.flip}>
            {hoveredNode ? (
              <NodeTooltip node={hoveredNode} color={colorFor(hoveredNode)} isHappiness={isHappiness} />
            ) : hoveredBand ? (
              <BandTooltip band={hoveredBand} color={colorFor(hoveredBand.source)} isHappiness={isHappiness} />
            ) : null}
          </Tooltip>
        )}
      </div>

      <Caption node={hoveredNode} band={hoveredBand} groupBy={data.groupBy} />
    </div>
  );
}

/* ---------- layout ---------- */

/**
 * Stack each column's nodes and cut every node's edge into bands — one per
 * link, ordered so ribbons cross as little as possible.
 */
function useLayout(data: JourneyFlowResponse, height: number) {
  return useMemo(() => {
    const columnCount = data.columns.length;
    const byColumn = data.columns.map((_, c) => data.nodes.filter((n) => n.column === c));

    // One scale across every column, so bar heights stay comparable.
    const heaviest = Math.max(...byColumn.map((col) => col.reduce((s, n) => s + n.visitors, 0)), 1);
    const busiest = Math.max(...byColumn.map((col) => col.length), 1);
    const usable = height - PAD_Y * 2 - (busiest - 1) * NODE_GAP;
    const scale = usable / heaviest;

    const x = (column: number) =>
      columnCount <= 1
        ? W / 2
        : PAD_LEFT + (column * (W - PAD_LEFT - PAD_RIGHT)) / (columnCount - 1);

    const nodes: Placed[] = [];
    byColumn.forEach((column, c) => {
      const sorted = [...column].sort((a, b) => b.visitors - a.visitors);
      const heights = sorted.map((n) => Math.max(MIN_BAND, n.visitors * scale));
      const stack = heights.reduce((s, h) => s + h, 0) + (sorted.length - 1) * NODE_GAP;
      let cursor = Math.max(PAD_Y, (height - stack) / 2);
      // Thin bars sit too close to label them all; keep the ones that fit and
      // let the rest speak through their tooltip.
      let lastLabel = -Infinity;

      sorted.forEach((node, i) => {
        const mid = cursor + heights[i] / 2;
        const labelled = mid - lastLabel >= LABEL_GAP;
        if (labelled) lastLabel = mid;
        nodes.push({ ...node, x: x(c), y: cursor, h: heights[i], labelled });
        cursor += heights[i] + NODE_GAP;
      });
    });

    const byId = new Map(nodes.map((n) => [n.id, n]));

    // Walk each node's edge top-down, handing every link its own slice.
    const outCursor = new Map(nodes.map((n) => [n.id, n.y]));
    const inCursor = new Map(nodes.map((n) => [n.id, n.y]));
    const resolved = data.links
      .map((link) => ({ link, source: byId.get(link.source), target: byId.get(link.target) }))
      .filter((r): r is { link: (typeof data.links)[number]; source: Placed; target: Placed } =>
        Boolean(r.source && r.target),
      );

    const bands: Band[] = resolved
      .sort((a, b) => a.source.y - b.source.y || a.target.y - b.target.y)
      .map(({ link, source, target }) => {
        const h = Math.max(MIN_BAND, link.value * scale);
        const y1 = outCursor.get(source.id) ?? source.y;
        const y2 = inCursor.get(target.id) ?? target.y;
        outCursor.set(source.id, y1 + h);
        inCursor.set(target.id, y2 + h);
        return { id: link.id, source, target, value: link.value, sharePct: link.sharePct, happiness: link.happiness, y1, y2, h };
      });

    return { nodes, bands };
  }, [data, height]);
}

/** A ribbon: two cubic beziers (top edge out, bottom edge back) closed into a band. */
function ribbon(band: Band): string {
  const x1 = band.source.x + NODE_W / 2;
  const x2 = band.target.x - NODE_W / 2;
  const mx = (x1 + x2) / 2;
  const { y1, y2, h } = band;
  return [
    `M${x1} ${y1}`,
    `C${mx} ${y1} ${mx} ${y2} ${x2} ${y2}`,
    `L${x2} ${y2 + h}`,
    `C${mx} ${y2 + h} ${mx} ${y1 + h} ${x1} ${y1 + h}`,
    "Z",
  ].join(" ");
}

/* ---------- chrome ---------- */

function ColumnHeaders({ columns }: { columns: string[] }) {
  return (
    <div
      className="grid pb-1"
      style={{ gridTemplateColumns: `repeat(${columns.length}, minmax(0, 1fr))` }}
    >
      {columns.map((name) => (
        <span
          key={name}
          className="text-center text-[10px] font-semibold tracking-[0.12em] text-muted-foreground uppercase"
        >
          {name}
        </span>
      ))}
    </div>
  );
}

/**
 * Outer columns get their label and total in the margin; inner columns get a
 * chip on the bar, since there's no clear margin to put it in.
 */
function NodeLabel({
  node,
  lastColumn,
  dimmed,
}: {
  node: Placed;
  lastColumn: number;
  dimmed: boolean;
}) {
  if (!node.labelled) return null;

  const mid = node.y + node.h / 2;
  const outer = node.column === 0 || node.column === lastColumn;
  const opacity = dimmed ? 0.25 : 1;

  if (outer) {
    const left = node.column === 0;
    return (
      <text
        x={node.x + (left ? -NODE_W : NODE_W)}
        y={mid}
        textAnchor={left ? "end" : "start"}
        opacity={opacity}
        className="pointer-events-none transition-opacity duration-150"
      >
        <tspan className="fill-foreground text-[13px]">{node.name}</tspan>
        <tspan
          x={node.x + (left ? -NODE_W : NODE_W)}
          dy="1.25em"
          className="fill-muted-foreground text-[12px] tabular-nums"
        >
          {formatNumber(node.visitors)}
        </tspan>
      </text>
    );
  }

  const width = node.name.length * 6.6 + 12;
  return (
    <g opacity={opacity} className="pointer-events-none transition-opacity duration-150">
      <rect
        x={node.x - width / 2}
        y={mid - 9}
        width={width}
        height={18}
        rx={4}
        className="fill-card"
        opacity={0.92}
      />
      <text
        x={node.x}
        y={mid + 4}
        textAnchor="middle"
        className="fill-foreground text-[12px]"
      >
        {node.name}
      </text>
    </g>
  );
}

/* ---------- tooltip ---------- */

/** Anchored to the cursor, flipped away from the right edge when it would overflow. */
function Tooltip({
  x,
  y,
  flip,
  children,
}: {
  x: number;
  y: number;
  flip: boolean;
  children: ReactNode;
}) {
  return (
    <div
      role="tooltip"
      className="pointer-events-none absolute z-10 w-[290px] rounded-lg border bg-popover p-3 shadow-lg"
      style={{
        left: flip ? undefined : x + 16,
        right: flip ? `calc(100% - ${x - 16}px)` : undefined,
        top: Math.max(0, y - 40),
      }}
    >
      {children}
    </div>
  );
}

function NodeTooltip({
  node,
  color,
  isHappiness,
}: {
  node: Placed;
  color: string;
  isHappiness: boolean;
}) {
  const total = node.visitors || 1;
  return (
    <div className="flex flex-col gap-2.5">
      <div className="flex items-baseline justify-between gap-3">
        <span className="flex items-center gap-2 text-[13px] font-semibold">
          <span className="h-2.5 w-2.5 rounded-[2px]" style={{ background: color }} />
          {node.name}
        </span>
        <span className="text-[13px] tabular-nums">
          {formatNumber(node.visitors)}{" "}
          <span className="text-muted-foreground">total</span>
        </span>
      </div>

      {isHappiness && (
        <div className="flex items-center justify-between text-xs">
          <span className="text-muted-foreground">Sentiment</span>
          <span className="font-semibold tabular-nums" style={{ color }}>
            {node.happiness.toFixed(1)}/100
          </span>
        </div>
      )}

      <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
        <span className="flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-[2px]" style={{ background: color }} />
          {formatNumber(node.fromFunnel)} from funnel
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-[2px]" style={{ background: color, opacity: 0.35 }} />
          {formatNumber(node.startedHere)} started here
        </span>
      </div>

      {node.contributors.length > 0 && (
        <div className="flex flex-col gap-1 border-t pt-2">
          {node.contributors.slice(0, 5).map((c) => (
            <div key={c.id} className="flex items-center gap-2 text-[11px]">
              <span className="min-w-0 flex-1 truncate">{c.name}</span>
              <span className="flex h-2 w-14 overflow-hidden rounded-[2px] bg-muted">
                <span
                  style={{ background: color, width: `${(c.fromFunnel / total) * 100}%` }}
                />
                <span
                  style={{
                    background: color,
                    opacity: 0.35,
                    width: `${(c.startedHere / total) * 100}%`,
                  }}
                />
              </span>
              <span className="w-10 text-right font-semibold tabular-nums">
                {formatNumber(c.fromFunnel)}
              </span>
              <span className="w-10 text-right tabular-nums text-muted-foreground">
                {formatNumber(c.startedHere)}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function BandTooltip({
  band,
  color,
  isHappiness,
}: {
  band: Band;
  color: string;
  isHappiness: boolean;
}) {
  return (
    <div className="flex flex-col gap-2">
      <span className="flex items-center gap-2 text-[13px] font-semibold">
        <span className="h-2.5 w-2.5 rounded-[2px]" style={{ background: color }} />
        {band.source.name}
        <span className="text-muted-foreground">→</span>
        {band.target.name}
      </span>

      <div className="flex items-baseline justify-between gap-3 text-xs">
        <span className="text-muted-foreground">Visitors</span>
        <span className="font-semibold tabular-nums">{formatNumber(band.value)}</span>
      </div>
      <div className="flex items-baseline justify-between gap-3 text-xs">
        <span className="text-muted-foreground">Share of {band.source.name}</span>
        <span className="font-semibold tabular-nums">{band.sharePct}%</span>
      </div>
      {isHappiness && (
        <div className="flex items-baseline justify-between gap-3 text-xs">
          <span className="text-muted-foreground">Sentiment</span>
          <span className="font-semibold tabular-nums" style={{ color }}>
            {band.happiness.toFixed(1)}/100
          </span>
        </div>
      )}
    </div>
  );
}

/** The line under the chart — narrates the hovered item, or prompts for one. */
function Caption({
  node,
  band,
  groupBy,
}: {
  node?: Placed;
  band?: Band;
  groupBy: JourneyFlowResponse["groupBy"];
}) {
  if (band) {
    return (
      <p className="text-xs" aria-live="polite">
        <span className="font-semibold tabular-nums">{formatNumber(band.value)}</span> visitors (
        {band.sharePct}%) moved from{" "}
        <span className="font-semibold" style={{ color: chart.secondary }}>
          {band.source.name}
        </span>{" "}
        <span className="text-muted-foreground">→</span>{" "}
        <span className="font-semibold">{band.target.name}</span>
      </p>
    );
  }

  if (node) {
    return (
      <p className="text-xs" aria-live="polite">
        <span className="font-semibold" style={{ color: chart.primary }}>
          {node.name}
        </span>{" "}
        <span className="font-semibold tabular-nums">{formatNumber(node.visitors)}</span> total
        visitors ·{" "}
        <span className="tabular-nums">{formatNumber(node.fromFunnel)}</span> came from the funnel ·{" "}
        <span className="tabular-nums">{formatNumber(node.startedHere)}</span> started here
      </p>
    );
  }

  return (
    <p className="text-xs text-muted-foreground italic" aria-live="polite">
      Hover a {groupBy === "zone" ? "zone" : "phase"} or flow for details
    </p>
  );
}
