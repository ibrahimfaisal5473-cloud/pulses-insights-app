"use client";

import { useEffect, useRef, useState } from "react";

export type TreemapItem = {
  id: string;
  name: string;
  /** Drives the block area. Must be >= 0. */
  value: number;
  /** Big figure rendered in the block. */
  display: string;
  /** Small suffix after the figure (e.g. "/100"). */
  displaySuffix?: string;
  /** Caption under the figure (e.g. sample size, share of total). */
  caption?: string;
  color: string;
  title: string;
};

type Rect = { x: number; y: number; w: number; h: number };
type Tile = Rect & { item: TreemapItem };

/**
 * Zone treemap — block area is proportional to the item's value.
 *
 * Uses a squarified layout (Bruls, Huizing & van Wijk) rather than
 * slice-and-dice: blocks stay close to square, which is what keeps every
 * label and figure legible instead of collapsing into unreadable slivers.
 */
export function ZoneTreemap({
  items,
  height = 320,
}: {
  items: TreemapItem[];
  height?: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(0);

  // The layout depends on the real aspect ratio, so it can't be computed until
  // we know how wide the card actually is.
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new ResizeObserver(([entry]) =>
      setWidth(entry.contentRect.width),
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const ranked = items.filter((i) => i.value > 0).sort((a, b) => b.value - a.value);
  const tiles =
    width > 0 && ranked.length > 0
      ? squarify(ranked, { x: 0, y: 0, w: width, h: height })
      : [];

  return (
    <div ref={ref} style={{ height }} className="relative w-full">
      {tiles.map(({ item, x, y, w, h }) => (
        <Block key={item.id} item={item} x={x} y={y} w={w} h={h} />
      ))}
    </div>
  );
}

const GAP = 6;

function Block({ item, x, y, w, h }: Tile) {
  const boxW = Math.max(0, w - GAP);
  const boxH = Math.max(0, h - GAP);

  // Only draw what actually fits — a truncated name colliding with its own
  // figure is worse than no name at all.
  const showName = boxH >= 44 && boxW >= 64;
  const showCaption = Boolean(item.caption) && boxH >= 76 && boxW >= 96;
  const showFigure = boxH >= 26 && boxW >= 44;
  const figureSize = boxH >= 120 && boxW >= 150 ? "text-3xl" : boxH >= 70 ? "text-xl" : "text-sm";

  return (
    <div
      title={item.title}
      className="absolute flex flex-col justify-between overflow-hidden rounded-lg px-3 py-2 text-white"
      style={{
        left: x,
        top: y,
        width: boxW,
        height: boxH,
        background: item.color,
      }}
    >
      <span className="truncate text-xs font-medium opacity-95">
        {showName ? item.name : " "}
      </span>

      {showFigure && (
        <span className="flex flex-col">
          <span className="truncate font-heading font-semibold leading-tight tabular-nums">
            <span className={figureSize}>{item.display}</span>
            {item.displaySuffix && (
              <span className="text-xs opacity-80">{item.displaySuffix}</span>
            )}
          </span>
          {showCaption && (
            <span className="truncate text-[11px] opacity-80">{item.caption}</span>
          )}
        </span>
      )}
    </div>
  );
}

/** Lay `items` (descending by value) out into `rect` as a squarified treemap. */
function squarify(items: TreemapItem[], rect: Rect): Tile[] {
  const total = items.reduce((sum, i) => sum + i.value, 0);
  if (total <= 0) return [];

  // Work in area units so a row's area maps directly onto the rect.
  const scale = (rect.w * rect.h) / total;
  const queue = items.map((item) => ({ item, area: item.value * scale }));

  const tiles: Tile[] = [];
  let free = { ...rect };
  let row: typeof queue = [];

  while (queue.length > 0) {
    const next = queue[0];
    const short = Math.min(free.w, free.h);

    // Grow the row while doing so keeps the blocks closer to square.
    if (row.length === 0 || worst(row, short) >= worst([...row, next], short)) {
      row.push(next);
      queue.shift();
    } else {
      tiles.push(...placeRow(row, free));
      free = shrink(row, free);
      row = [];
    }
  }
  if (row.length > 0) tiles.push(...placeRow(row, free));

  return tiles;
}

/** Worst (largest) aspect ratio in `row` if laid along a side of length `short`. */
function worst(row: { area: number }[], short: number): number {
  const sum = row.reduce((s, r) => s + r.area, 0);
  if (sum <= 0 || short <= 0) return Infinity;
  const max = Math.max(...row.map((r) => r.area));
  const min = Math.min(...row.map((r) => r.area));
  return Math.max((short * short * max) / (sum * sum), (sum * sum) / (short * short * min));
}

function placeRow(row: { item: TreemapItem; area: number }[], free: Rect): Tile[] {
  const sum = row.reduce((s, r) => s + r.area, 0);
  const tiles: Tile[] = [];

  if (free.h <= free.w) {
    // Row becomes a column down the left edge of the free space.
    const w = sum / free.h;
    let y = free.y;
    for (const { item, area } of row) {
      const h = area / w;
      tiles.push({ item, x: free.x, y, w, h });
      y += h;
    }
  } else {
    // Row becomes a band across the top of the free space.
    const h = sum / free.w;
    let x = free.x;
    for (const { item, area } of row) {
      const w = area / h;
      tiles.push({ item, x, y: free.y, w, h });
      x += w;
    }
  }

  return tiles;
}

function shrink(row: { area: number }[], free: Rect): Rect {
  const sum = row.reduce((s, r) => s + r.area, 0);
  if (free.h <= free.w) {
    const w = sum / free.h;
    return { x: free.x + w, y: free.y, w: free.w - w, h: free.h };
  }
  const h = sum / free.w;
  return { x: free.x, y: free.y + h, w: free.w, h: free.h - h };
}
