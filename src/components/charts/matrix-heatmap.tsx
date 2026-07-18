"use client";

export type MatrixRow = { id: string; label: string };
export type MatrixColumn = { id: string; label: string };

export type MatrixCell = {
  rowId: string;
  colId: string;
  /** Text drawn inside the cell. */
  display: string;
  color: string;
  /** Too little data to trust — rendered faint. */
  muted?: boolean;
  title: string;
};

/**
 * Row × column heatmap with a figure in every cell — used for the per-zone
 * over-time grids. Unlike `HeatmapGrid` (day × hour, colour-only), the value
 * is legible in the cell itself, so the grid can be read exactly rather than
 * just scanned for shape.
 */
export function MatrixHeatmap({
  rows,
  columns,
  cells,
  legend,
  mutedNote,
  ariaLabel,
}: {
  rows: MatrixRow[];
  columns: MatrixColumn[];
  cells: MatrixCell[];
  /** Gradient end labels, e.g. ["Unhappy", "Happy"]. */
  legend: [string, string];
  /** Explains what a faint cell means. */
  mutedNote?: string;
  ariaLabel: string;
}) {
  const byKey = new Map(cells.map((c) => [`${c.rowId}:${c.colId}`, c]));

  return (
    <div className="flex flex-col gap-3">
      <div className="overflow-x-auto">
        <div
          role="img"
          aria-label={ariaLabel}
          className="grid gap-1"
          style={{
            gridTemplateColumns: `10rem repeat(${columns.length}, minmax(2.25rem, 1fr))`,
          }}
        >
          <span />
          {columns.map((col) => (
            <span
              key={col.id}
              className="pb-1 text-center text-[10px] tabular-nums text-muted-foreground"
            >
              {col.label}
            </span>
          ))}

          {rows.map((row) => (
            <Row key={row.id} row={row} columns={columns} byKey={byKey} />
          ))}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-4 text-[11px] text-muted-foreground">
        <span className="flex items-center gap-2">
          {legend[0]}
          <span
            className="h-2 w-24 rounded-full"
            style={{
              background:
                "linear-gradient(90deg, rgb(163,35,32), rgb(184,134,47), rgb(110,139,61), rgb(63,99,37))",
            }}
          />
          {legend[1]}
        </span>
        {mutedNote && (
          <span className="flex items-center gap-1.5">
            <span className="h-3 w-3 rounded-[3px] bg-muted opacity-40" />
            {mutedNote}
          </span>
        )}
      </div>
    </div>
  );
}

function Row({
  row,
  columns,
  byKey,
}: {
  row: MatrixRow;
  columns: MatrixColumn[];
  byKey: Map<string, MatrixCell>;
}) {
  return (
    <>
      <span className="flex items-center truncate pr-2 text-[11px] text-muted-foreground">
        {row.label}
      </span>
      {columns.map((col) => {
        const cell = byKey.get(`${row.id}:${col.id}`);
        if (!cell) {
          return <div key={col.id} className="h-7 rounded-[4px] bg-muted/30" />;
        }
        return (
          <div
            key={col.id}
            title={cell.title}
            className="flex h-7 items-center justify-center rounded-[4px] text-[11px] font-medium tabular-nums text-white"
            style={{
              background: cell.color,
              opacity: cell.muted ? 0.3 : 1,
            }}
          >
            {cell.display}
          </div>
        );
      })}
    </>
  );
}
