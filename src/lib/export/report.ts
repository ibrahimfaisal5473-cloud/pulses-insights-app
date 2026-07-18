"use client";

import { captureNode, slugify } from "./capture";
import { WIDGET_TITLE_ATTR, collectExportNodes } from "./attrs";

/**
 * Full multi-section PDF report: captures every tagged block across all
 * dashboard sections and composes them into one paginated A4 document.
 * See ./attrs for how widgets opt in.
 */

export type ReportSection = { title: string; container: HTMLElement };

export type ReportMeta = {
  /** Report title — the site/venue name. */
  title: string;
  /** Human-readable date range, e.g. "27 Apr – 12 Jun 2026". */
  range: string;
  /** Short description of any active filters. */
  filters?: string;
};

/** A4 portrait in points. */
const PAGE_W = 595.28;
const PAGE_H = 841.89;
const MARGIN = 40;
const CONTENT_W = PAGE_W - MARGIN * 2;
/** Tallest a single captured block may be drawn before it gets scaled down. */
const MAX_BLOCK_H = PAGE_H - MARGIN * 2;

const INK = { r: 42, g: 37, b: 33 };
const RED = { r: 215, g: 25, b: 33 };
const MUTED = { r: 122, g: 113, b: 102 };

export type ReportProgress = { done: number; total: number; label: string };

/**
 * Captures every tagged block in each section and composes the PDF.
 * Reports progress so the trigger button can show "3 / 27".
 */
export async function buildReportPdf(
  sections: ReportSection[],
  meta: ReportMeta,
  onProgress?: (progress: ReportProgress) => void,
) {
  const { jsPDF } = await import("jspdf");
  const doc = new jsPDF({ orientation: "portrait", unit: "pt", format: "a4" });

  const blocks = sections.map((section) => ({
    title: section.title,
    nodes: collectExportNodes(section.container),
  }));
  const total = blocks.reduce((sum, b) => sum + b.nodes.length, 0);
  let done = 0;

  drawCover(doc, meta, total);

  let y = PAGE_H; // Forces the first section to start a fresh page.

  for (const block of blocks) {
    if (block.nodes.length === 0) continue;

    doc.addPage();
    y = drawSectionHeading(doc, block.title);

    for (const node of block.nodes) {
      const title = node.getAttribute(WIDGET_TITLE_ATTR) || block.title;
      onProgress?.({ done, total, label: title });

      const canvas = await captureNode(node);
      let imgW = CONTENT_W;
      let imgH = (canvas.height / canvas.width) * imgW;

      // A block taller than a whole page (a long table, say) would otherwise
      // run off the bottom, so scale it to fit and centre what's left over.
      if (imgH > MAX_BLOCK_H) {
        imgH = MAX_BLOCK_H;
        imgW = (canvas.width / canvas.height) * imgH;
      }

      // Break to a new page when the block won't fit in the remaining space.
      if (y + imgH > PAGE_H - MARGIN) {
        doc.addPage();
        y = MARGIN;
      }

      doc.addImage(
        canvas.toDataURL("image/jpeg", 0.9),
        "JPEG",
        MARGIN + (CONTENT_W - imgW) / 2,
        y,
        imgW,
        imgH,
      );
      y += imgH + 18;

      done += 1;
      onProgress?.({ done, total, label: title });
    }
  }

  paginate(doc, meta);
  doc.save(`${slugify(meta.title)}-full-report.pdf`);
}

/** Title page: brand, report name, range, filters, generated timestamp. */
function drawCover(doc: import("jspdf").jsPDF, meta: ReportMeta, total: number) {
  doc.setFillColor(RED.r, RED.g, RED.b);
  doc.rect(0, 0, PAGE_W, 6, "F");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(30);
  doc.setTextColor(INK.r, INK.g, INK.b);
  doc.text(meta.title, MARGIN, 220, { maxWidth: CONTENT_W });

  doc.setFont("helvetica", "normal");
  doc.setFontSize(15);
  doc.setTextColor(RED.r, RED.g, RED.b);
  doc.text("Full Insights Report", MARGIN, 250);

  doc.setDrawColor(226, 222, 214);
  doc.line(MARGIN, 274, PAGE_W - MARGIN, 274);

  const rows: [string, string][] = [
    ["Date range", meta.range],
    ["Filters", meta.filters || "None — all visitors"],
    ["Charts included", String(total)],
    [
      "Generated",
      new Intl.DateTimeFormat("en-GB", {
        dateStyle: "long",
        timeStyle: "short",
      }).format(new Date()),
    ],
  ];

  let y = 306;
  for (const [label, value] of rows) {
    doc.setFontSize(8);
    doc.setTextColor(MUTED.r, MUTED.g, MUTED.b);
    doc.text(label.toUpperCase(), MARGIN, y);

    doc.setFontSize(12);
    doc.setTextColor(INK.r, INK.g, INK.b);
    doc.text(value, MARGIN, y + 17, { maxWidth: CONTENT_W });
    y += 46;
  }
}

/** Section divider heading; returns the y to start laying out widgets from. */
function drawSectionHeading(doc: import("jspdf").jsPDF, title: string): number {
  doc.setFont("helvetica", "bold");
  doc.setFontSize(17);
  doc.setTextColor(INK.r, INK.g, INK.b);
  doc.text(title, MARGIN, MARGIN + 16);

  doc.setDrawColor(RED.r, RED.g, RED.b);
  doc.setLineWidth(1.5);
  doc.line(MARGIN, MARGIN + 26, MARGIN + 42, MARGIN + 26);
  doc.setLineWidth(0.2);

  return MARGIN + 46;
}

/** Footer on every page except the cover. */
function paginate(doc: import("jspdf").jsPDF, meta: ReportMeta) {
  const pages = doc.getNumberOfPages();
  for (let page = 2; page <= pages; page += 1) {
    doc.setPage(page);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(MUTED.r, MUTED.g, MUTED.b);
    doc.text(`${meta.title} · ${meta.range}`, MARGIN, PAGE_H - 22);
    doc.text(`${page - 1} / ${pages - 1}`, PAGE_W - MARGIN, PAGE_H - 22, {
      align: "right",
    });
  }
}
