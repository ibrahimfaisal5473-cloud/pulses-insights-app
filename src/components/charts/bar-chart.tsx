"use client";

import {
  Bar,
  BarChart as ReBarChart,
  Brush,
  CartesianGrid,
  Rectangle,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { chart } from "@/config/chart";
import { formatCompact } from "@/lib/utils";

export type BarSeries = {
  key: string;
  name: string;
  color: string;
};

/**
 * Reusable vertical bar chart — single or stacked series.
 * Presentational only; data arrives via props.
 */
/** Row shape accepted by the chart — an x value plus one key per series. */
export type BarRow = Record<string, string | number>;

/** Rounded pill handle for the brush — the default is a plain grey rect. */
function BrushTraveller({
  x,
  y,
  width,
  height,
}: {
  x: number;
  y: number;
  width: number;
  height: number;
}) {
  const midX = x + width / 2;
  const midY = y + height / 2;
  return (
    <g>
      <rect
        x={x}
        y={y}
        width={width}
        height={height}
        rx={width / 2}
        fill={chart.primary}
      />
      <line
        x1={midX - width / 4}
        x2={midX + width / 4}
        y1={midY}
        y2={midY}
        stroke="#fff"
        strokeWidth={1.5}
        strokeLinecap="round"
      />
    </g>
  );
}

/** The subset of recharts' bar-shape props this chart reads. */
type BarShapeProps = {
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  fill?: string;
  payload?: BarRow;
  index?: number;
};

/** One bar, plus its value label when the chart asks for one. */
function BarShape({ color, label, ...props }: BarShapeProps & { color?: string; label?: string }) {
  const { x = 0, y = 0, width = 0 } = props;
  return (
    <g>
      <Rectangle {...props} fill={color ?? props.fill} radius={[3, 3, 0, 0]} />
      {label !== undefined && (
        <text
          x={x + width / 2}
          y={y - 8}
          textAnchor="middle"
          fontSize={12}
          fontWeight={600}
          fill="var(--foreground)"
        >
          {label}
        </text>
      )}
    </g>
  );
}

/** Renders one x tick, in the accent colour when it's the highlighted one. */
function HighlightTick({
  x,
  y,
  payload,
  formatter,
  highlight,
}: {
  x?: number;
  y?: number;
  payload?: { value: string | number };
  formatter?: (value: string) => string;
  highlight?: string | number;
}) {
  const raw = payload?.value ?? "";
  const on = highlight !== undefined && raw === highlight;
  return (
    <text
      x={x}
      y={(y ?? 0) + 12}
      textAnchor="middle"
      fontSize={11}
      fontWeight={on ? 600 : 400}
      fill={on ? chart.primary : "var(--muted-foreground)"}
    >
      {formatter ? formatter(String(raw)) : String(raw)}
    </text>
  );
}

export function BarChart({
  data,
  xKey,
  series,
  height = 280,
  xTickFormatter,
  valueFormatter = (v) => formatCompact(v),
  stacked = false,
  brush = false,
  yDomain,
  showLabels = false,
  cellColor,
  highlightX,
}: {
  data: BarRow[];
  xKey: string;
  series: BarSeries[];
  height?: number;
  xTickFormatter?: (value: string) => string;
  /** `row` is the full data row, for tooltips that quote more than the value. */
  valueFormatter?: (value: number, row?: BarRow) => string;
  stacked?: boolean;
  /** Show a draggable range slider under the chart to zoom into a window. */
  brush?: boolean;
  /** Fixed y range — for scales like sentiment where 0 is not a useful floor. */
  yDomain?: [number, number];
  /** Print each bar's value above it. */
  showLabels?: boolean;
  /** Per-bar colour, for singling out one bar in a series. */
  cellColor?: (row: BarRow, index: number) => string;
  /** x value whose tick is drawn in the accent colour. */
  highlightX?: string | number;
}) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <ReBarChart data={data} margin={{ top: showLabels ? 22 : 8, right: 8, bottom: 0, left: -12 }}>
        <CartesianGrid strokeDasharray="3 6" stroke="var(--border)" vertical={false} />
        <XAxis
          dataKey={xKey}
          tickFormatter={xTickFormatter}
          tick={
            highlightX !== undefined ? (
              <HighlightTick formatter={xTickFormatter} highlight={highlightX} />
            ) : (
              { fontSize: 11, fill: "var(--muted-foreground)" }
            )
          }
          tickLine={false}
          axisLine={false}
          minTickGap={24}
        />
        <YAxis
          domain={yDomain}
          tickFormatter={(v) => formatCompact(Number(v))}
          tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
          tickLine={false}
          axisLine={false}
          width={48}
        />
        <Tooltip
          cursor={{ fill: "var(--muted)", opacity: 0.4 }}
          labelFormatter={(v) => (xTickFormatter ? xTickFormatter(String(v)) : String(v))}
          formatter={(value, name, item) => [
            valueFormatter(Number(value), item?.payload as BarRow),
            String(name),
          ]}
          contentStyle={{
            background: "var(--popover)",
            border: "1px solid var(--border)",
            borderRadius: 10,
            color: "var(--popover-foreground)",
            fontSize: 12,
          }}
        />
        {series.map((s, i) => (
          <Bar
            key={s.key}
            dataKey={s.key}
            name={s.name}
            fill={s.color ?? chart.series[i % chart.series.length]}
            stackId={stacked ? "stack" : undefined}
            radius={stacked && i < series.length - 1 ? 0 : [3, 3, 0, 0]}
            maxBarSize={38}
            // Per-bar colour and value labels are both drawn here rather than
            // via <Cell> / <LabelList>: in recharts 3.9 either of those
            // silently suppresses the other, and some charts need both.
            shape={
              cellColor || showLabels
                ? (props: BarShapeProps) => (
                    <BarShape
                      {...props}
                      color={cellColor?.(props.payload ?? {}, props.index ?? 0)}
                      label={
                        showLabels
                          ? valueFormatter(Number(props.payload?.[s.key]), props.payload)
                          : undefined
                      }
                    />
                  )
                : undefined
            }
          >
          </Bar>
        ))}
        {brush && (
          <Brush
            dataKey={xKey}
            height={20}
            travellerWidth={9}
            tickFormatter={(value) =>
              xTickFormatter ? xTickFormatter(String(value)) : String(value)
            }
            traveller={(props) => <BrushTraveller {...props} />}
          />
        )}
      </ReBarChart>
    </ResponsiveContainer>
  );
}

/**
 * Small legend row matching the chart series. Pass `values` (keyed by series
 * key) to show each series' total alongside its name — with a stacked chart
 * the per-series magnitude is otherwise impossible to read off the bars.
 */
export function ChartLegend({
  series,
  values,
}: {
  series: BarSeries[];
  values?: Record<string, string>;
}) {
  return (
    <div className="flex flex-wrap gap-x-4 gap-y-2 text-xs text-muted-foreground">
      {series.map((s) => (
        <span key={s.key} className="flex items-center gap-1.5">
          <span
            className="h-2.5 w-2.5 rounded-[3px]"
            style={{ background: s.color }}
          />
          {s.name}
          {values?.[s.key] && (
            <span className="font-heading font-semibold tabular-nums text-foreground">
              {values[s.key]}
            </span>
          )}
        </span>
      ))}
    </div>
  );
}
