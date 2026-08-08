import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

const numberFormat = new Intl.NumberFormat("en-US")
const compactFormat = new Intl.NumberFormat("en-US", {
  notation: "compact",
  maximumFractionDigits: 1,
})

/** 12345 → "12,345" */
export function formatNumber(value: number): string {
  return numberFormat.format(value)
}

/** 12345 → "12.3K" — for tight spots like axis ticks. */
export function formatCompact(value: number): string {
  return compactFormat.format(value)
}

/** 0.4937 → "49.4%" (input is a ratio). */
export function formatPercent(ratio: number, digits = 1): string {
  return `${(ratio * 100).toFixed(digits)}%`
}

/**
 * Population-weighted mean of per-group scores.
 *
 * Each group's score is already an average over that group's members, so the
 * overall figure has to be weighted by group size — a band holding 0.6% of
 * visitors must not count as much as one holding 37.8%. Dividing by the number
 * of groups instead treats every empty group as a zero and drags the result
 * toward nothing: five populated age bands averaging ~76, divided by ten bands,
 * reported 38.
 *
 * Groups with no members carry zero weight and drop out on their own, so a
 * populated group that genuinely scores zero is still counted.
 */
export function weightedMean(points: { score: number; weight: number }[]): number {
  const totalWeight = points.reduce((sum, p) => sum + p.weight, 0)
  if (totalWeight > 0) {
    return points.reduce((sum, p) => sum + p.score * p.weight, 0) / totalWeight
  }

  // No weights yet — the counts request is still in flight. Fall back to a mean
  // over the groups that actually reported a score, never over the empty ones.
  const reported = points.filter((p) => p.score > 0)
  if (reported.length === 0) return 0
  return reported.reduce((sum, p) => sum + p.score, 0) / reported.length
}

/** "2026-07-16T00:00:00Z" → "16 Jul" */
export function formatShortDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    timeZone: "UTC",
  })
}

const dayFormat = new Intl.DateTimeFormat("en-GB", {
  day: "numeric",
  month: "short",
  year: "numeric",
})

/** "27 Apr – 12 Jun 2026", dropping the year from the start when it repeats. */
export function formatDateRange(start: Date, end: Date): string {
  const endLabel = dayFormat.format(end)
  if (start.toDateString() === end.toDateString()) return endLabel

  const startLabel =
    start.getFullYear() === end.getFullYear()
      ? dayFormat.format(start).replace(` ${start.getFullYear()}`, "")
      : dayFormat.format(start)

  return `${startLabel} – ${endLabel}`
}
