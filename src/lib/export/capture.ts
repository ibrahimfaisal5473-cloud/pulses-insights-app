"use client";

/**
 * DOM → image capture used by the widget download menu and the full PDF
 * report. html2canvas-pro (rather than the original html2canvas) because
 * Tailwind v4 compiles opacity modifiers to `color-mix(in oklab, …)`, which
 * the unmaintained original cannot parse.
 *
 * Both entry points are dynamically imported so the ~200kB of canvas/PDF code
 * only loads when a user actually exports something.
 */

/**
 * Marks elements that exist for interaction only and must not appear in an
 * export — the download menu itself, chart brush handles, etc.
 */
export const EXPORT_HIDE_ATTR = "data-export-hide";

/** Capture scale. The reference report uses ~2.5x; that keeps chart text crisp
 * when the image is scaled down into a PDF page without bloating file size. */
const SCALE = 2.5;

/** Turns a widget title into a safe filename stem. */
export function slugify(value: string): string {
  return (
    value
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "") || "export"
  );
}

/** Resolves the nearest non-transparent background so exports aren't see-through. */
function resolveBackground(node: HTMLElement): string {
  let current: HTMLElement | null = node;
  while (current) {
    const bg = getComputedStyle(current).backgroundColor;
    if (bg && bg !== "transparent" && !bg.startsWith("rgba(0, 0, 0, 0)")) return bg;
    current = current.parentElement;
  }
  return getComputedStyle(document.body).backgroundColor || "#ffffff";
}

/**
 * Renders a DOM node to a canvas at export resolution.
 *
 * Waits for webfonts first — otherwise headings capture in the fallback face
 * and the export looks nothing like the screen.
 */
export async function captureNode(node: HTMLElement): Promise<HTMLCanvasElement> {
  const { default: html2canvas } = await import("html2canvas-pro");

  if (document.fonts?.ready) await document.fonts.ready;

  return html2canvas(node, {
    scale: SCALE,
    backgroundColor: resolveBackground(node),
    logging: false,
    useCORS: true,
    // Skip interaction-only chrome (the download menu, brush handles).
    ignoreElements: (el) => el.hasAttribute?.(EXPORT_HIDE_ATTR),
  });
}

/** Triggers a browser download for a blob/data URL. */
function triggerDownload(href: string, filename: string) {
  const link = document.createElement("a");
  link.href = href;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
}

/** Downloads a single widget as a PNG. */
export async function downloadNodeAsImage(node: HTMLElement, title: string) {
  const canvas = await captureNode(node);
  triggerDownload(canvas.toDataURL("image/png"), `${slugify(title)}.png`);
}

/**
 * Downloads a single widget as a one-page PDF, with the page sized to the
 * captured aspect ratio so the chart is never letterboxed or cropped.
 */
export async function downloadNodeAsPdf(node: HTMLElement, title: string) {
  const { jsPDF } = await import("jspdf");
  const canvas = await captureNode(node);

  const MARGIN = 32;
  const width = canvas.width / SCALE;
  const height = canvas.height / SCALE;

  const doc = new jsPDF({
    orientation: width >= height ? "landscape" : "portrait",
    unit: "pt",
    format: [width + MARGIN * 2, height + MARGIN * 2],
  });

  doc.addImage(
    canvas.toDataURL("image/jpeg", 0.92),
    "JPEG",
    MARGIN,
    MARGIN,
    width,
    height,
  );
  doc.save(`${slugify(title)}.pdf`);
}
