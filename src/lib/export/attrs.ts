/**
 * Export tagging — deliberately free of "use client" and of any top-level DOM
 * access so Server Components (the dashboard pages and section files) can
 * spread these attributes without becoming client boundaries.
 *
 * Widgets opt into the full PDF report by tagging their root node. The report
 * harness discovers nodes from the DOM rather than from a hand-maintained
 * list, so a newly added widget appears in the report automatically.
 */

export const WIDGET_EXPORT_ATTR = "data-widget-export";
export const WIDGET_TITLE_ATTR = "data-widget-title";

/** Spread onto a node to include it in the full report as one captured block. */
export function exportAttrs(title: string) {
  return { [WIDGET_EXPORT_ATTR]: "", [WIDGET_TITLE_ATTR]: title };
}

/**
 * Finds exportable blocks inside a container, keeping only the outermost of
 * any nested pair — a tagged stat row that contains tagged cards captures once
 * as a row, not once per row plus once per card.
 */
export function collectExportNodes(container: HTMLElement): HTMLElement[] {
  const all = Array.from(
    container.querySelectorAll<HTMLElement>(`[${WIDGET_EXPORT_ATTR}]`),
  );
  return all.filter(
    (node) => !all.some((other) => other !== node && other.contains(node)),
  );
}
