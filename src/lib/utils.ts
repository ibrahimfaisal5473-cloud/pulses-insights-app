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
