"use client";

import { useState, type RefObject } from "react";
import { FileText, ImageIcon, Loader2, MoreVertical } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  EXPORT_HIDE_ATTR,
  downloadNodeAsImage,
  downloadNodeAsPdf,
} from "@/lib/export/capture";

/**
 * Per-widget download menu (the "⋮" in the card header).
 *
 * Carries EXPORT_HIDE_ATTR so it removes itself from the very capture it
 * triggers — otherwise every exported chart would show an open menu button.
 */
export function WidgetMenu({
  targetRef,
  title,
}: {
  /** The card node to capture. */
  targetRef: RefObject<HTMLDivElement | null>;
  /** Widget title — used for the download filename. */
  title: string;
}) {
  const [busy, setBusy] = useState<"image" | "pdf" | null>(null);
  const [open, setOpen] = useState(false);

  async function run(kind: "image" | "pdf") {
    const node = targetRef.current;
    if (!node || busy) return;

    setBusy(kind);
    setOpen(false);
    try {
      await (kind === "image"
        ? downloadNodeAsImage(node, title)
        : downloadNodeAsPdf(node, title));
    } catch (error) {
      console.error(`Widget export failed: ${title}`, error);
    } finally {
      setBusy(null);
    }
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        {...{ [EXPORT_HIDE_ATTR]: "" }}
        aria-label={`Download options for ${title}`}
        disabled={busy !== null}
        className="inline-flex size-7 shrink-0 items-center justify-center rounded-lg border border-border text-muted-foreground transition-colors outline-none hover:bg-muted hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50 aria-expanded:bg-muted aria-expanded:text-foreground disabled:opacity-50"
      >
        {busy ? (
          <Loader2 className="size-3.5 animate-spin" />
        ) : (
          <MoreVertical className="size-3.5" />
        )}
      </PopoverTrigger>

      <PopoverContent align="end" className="w-52 p-1.5" {...{ [EXPORT_HIDE_ATTR]: "" }}>
        <MenuItem icon={<ImageIcon className="size-4" />} onClick={() => run("image")}>
          Download as Image
        </MenuItem>
        <MenuItem icon={<FileText className="size-4" />} onClick={() => run("pdf")}>
          Download as PDF
        </MenuItem>
      </PopoverContent>
    </Popover>
  );
}

function MenuItem({
  icon,
  onClick,
  children,
}: {
  icon: React.ReactNode;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-[13px] font-medium text-foreground transition-colors outline-none hover:bg-muted focus-visible:bg-muted"
    >
      <span className="text-muted-foreground">{icon}</span>
      {children}
    </button>
  );
}
