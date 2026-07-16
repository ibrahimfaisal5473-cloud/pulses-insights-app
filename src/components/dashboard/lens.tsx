"use client";

import { createContext, useContext, useMemo, useState, type ReactNode } from "react";
import { BarChart3, Smile } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Metric lens (Visits | Happiness) — mirrors the Emirates Insights convention
 * where a single top-level lens switches what the charts below measure.
 *
 * The provider is a Client Component but its children are passed through, so
 * the page can stay a Server Component and only the lens-aware islands
 * (the switch and the featured chart) re-render on change.
 */

export type Lens = "visits" | "happiness";

type LensContextValue = {
  lens: Lens;
  setLens: (lens: Lens) => void;
};

const LensContext = createContext<LensContextValue | null>(null);

export function LensProvider({ children }: { children: ReactNode }) {
  const [lens, setLens] = useState<Lens>("visits");
  const value = useMemo(() => ({ lens, setLens }), [lens]);
  return <LensContext.Provider value={value}>{children}</LensContext.Provider>;
}

export function useLens(): LensContextValue {
  const ctx = useContext(LensContext);
  if (!ctx) throw new Error("useLens must be used within a LensProvider");
  return ctx;
}

const OPTIONS: { value: Lens; label: string; icon: typeof BarChart3 }[] = [
  { value: "visits", label: "Visits", icon: BarChart3 },
  { value: "happiness", label: "Happiness", icon: Smile },
];

const NOTES: Record<Lens, string> = {
  visits: "Visits lens — footfall & movement",
  happiness: "Sentiment lens — green = happy, red = unhappy",
};

/** The lens row: LENS label + pill switch on the left, lens note on the right. */
export function LensSwitch() {
  const { lens, setLens } = useLens();

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-b pb-4">
      <div className="flex items-center gap-3">
        <span className="text-[10px] font-semibold tracking-[0.16em] text-muted-foreground">
          LENS
        </span>
        <div
          role="group"
          aria-label="Metric lens"
          className="inline-flex rounded-full border bg-muted/60 p-[3px]"
        >
          {OPTIONS.map(({ value, label, icon: Icon }) => {
            const active = lens === value;
            return (
              <button
                key={value}
                type="button"
                aria-pressed={active}
                onClick={() => setLens(value)}
                className={cn(
                  "inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-sm transition-colors",
                  active
                    ? "bg-foreground text-background"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                <Icon className="h-3.5 w-3.5" />
                {label}
              </button>
            );
          })}
        </div>
      </div>

      <span className="text-xs text-muted-foreground">{NOTES[lens]}</span>
    </div>
  );
}
