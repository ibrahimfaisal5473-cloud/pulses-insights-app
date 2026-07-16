import { AGE_BANDS, type AgeBand, type HeatmapDay, HEATMAP_DAYS } from "@/types";
import { BASE_DAILY_VISITORS, MOCK_ZONES, type MockZone } from "./zones";

/**
 * Deterministic mock analytics generator.
 *
 * Everything is derived from seeded PRNGs keyed on (date, zone, metric), so
 * the same query always returns the same numbers — across requests, reloads,
 * and processes — while still looking organic (weekday rhythm, lunchtime
 * peak, noisy day-to-day variance).
 */

/* ---------- seeded randomness ---------- */

function hashSeed(input: string): number {
  let h = 2166136261;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/** mulberry32 — small, fast, deterministic PRNG. */
function prng(seedText: string): () => number {
  let a = hashSeed(seedText);
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Single deterministic sample in [min, max) for a seed key. */
function sample(seedText: string, min = 0, max = 1): number {
  return min + prng(seedText)() * (max - min);
}

/* ---------- calendar helpers ---------- */

/** Date-only ISO string (UTC) for a Date. */
export function isoDay(d: Date): string {
  return d.toISOString().slice(0, 10);
}

/** Inclusive list of ISO day strings between two dates (UTC days). */
export function eachDay(start: Date, end: Date): string[] {
  const days: string[] = [];
  const cursor = new Date(
    Date.UTC(start.getUTCFullYear(), start.getUTCMonth(), start.getUTCDate()),
  );
  const last = Date.UTC(end.getUTCFullYear(), end.getUTCMonth(), end.getUTCDate());
  while (cursor.getTime() <= last) {
    days.push(isoDay(cursor));
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }
  return days;
}

/** Mon..Sun label for an ISO day. */
export function dayOfWeek(day: string): HeatmapDay {
  const idx = (new Date(`${day}T00:00:00Z`).getUTCDay() + 6) % 7; // Mon = 0
  return HEATMAP_DAYS[idx];
}

/* ---------- traffic model ---------- */

/** Weekly rhythm: busy midweek, quiet weekends. */
function weekdayFactor(day: string): number {
  const dow = dayOfWeek(day);
  if (dow === "Sat") return 0.32;
  if (dow === "Sun") return 0.22;
  const midweekBoost = { Mon: 0.94, Tue: 1.02, Wed: 1.08, Thu: 1.04, Fri: 0.92 }[dow];
  return midweekBoost ?? 1;
}

/** Unique visitors entering a zone on a given day. */
export function zoneDayVisitors(day: string, zone: MockZone): number {
  const jitter = sample(`v:${day}:${zone.id}`, 0.78, 1.22);
  return Math.round(BASE_DAILY_VISITORS * zone.weight * weekdayFactor(day) * jitter);
}

/** Share of a day's visitors that are first-time (new). */
export function newVisitorShare(day: string): number {
  return sample(`new:${day}`, 0.55, 0.68);
}

/** Male share of a day's visitors (rest are female). */
export function maleShare(day: string): number {
  return sample(`gender:${day}`, 0.45, 0.52);
}

/** Age-band weights for a day (jittered around a fixed profile, sums to 1). */
export function ageWeights(day: string): Record<AgeBand, number> {
  const base: Record<AgeBand, number> = {
    "0-14": 0.025,
    "15-24": 0.18,
    "25-34": 0.36,
    "35-44": 0.23,
    "45-54": 0.135,
    "55+": 0.07,
  };
  let total = 0;
  const jittered = {} as Record<AgeBand, number>;
  for (const band of AGE_BANDS) {
    jittered[band] = base[band] * sample(`age:${day}:${band}`, 0.85, 1.15);
    total += jittered[band];
  }
  for (const band of AGE_BANDS) jittered[band] /= total;
  return jittered;
}

/**
 * Hour-of-day distribution (site opens 07:00, closes 19:00, lunchtime peak).
 * Returns a weight per hour 7..18 summing to 1.
 */
export function hourWeights(day: string): { hour: number; weight: number }[] {
  const hours = Array.from({ length: 12 }, (_, i) => i + 7);
  const raw = hours.map((hour) => {
    const shape = Math.exp(-((hour - 11.5) ** 2) / 14); // peak ~11:30
    const jitter = sample(`h:${day}:${hour}`, 0.8, 1.2);
    return { hour, weight: shape * jitter };
  });
  const total = raw.reduce((s, r) => s + r.weight, 0);
  return raw.map((r) => ({ hour: r.hour, weight: r.weight / total }));
}

/** Site-wide happiness index (0–100) for a day, for the selected zones. */
export function dayHappiness(day: string, zones: MockZone[]): number {
  const zoneOffset =
    zones.reduce((s, z) => s + z.happinessOffset * z.weight, 0) /
    zones.reduce((s, z) => s + z.weight, 0);
  const dayNum = new Date(`${day}T00:00:00Z`).getTime() / 86400000;
  const drift = Math.sin(dayNum / 5.3) * 2.5;
  const noise = sample(`hap:${day}`, -3.5, 3.5);
  return Math.round(Math.min(97, Math.max(68, 84 + zoneOffset + drift + noise)) * 10) / 10;
}

/**
 * Stable happiness offsets per demographic segment, so "Happiness by
 * Gender/Age" reads consistently rather than reshuffling each request.
 */
export function segmentHappinessOffset(segment: string): number {
  return sample(`seg:${segment}`, -2.6, 2.6);
}

/* ---------- misc ---------- */

/** Resolve zone ids (empty = all zones); unknown ids are ignored. */
export function resolveZones(zoneIds: string[]): MockZone[] {
  if (zoneIds.length === 0) return MOCK_ZONES;
  const matched = MOCK_ZONES.filter((z) => zoneIds.includes(z.id));
  return matched.length > 0 ? matched : MOCK_ZONES;
}

/** Small artificial latency so loading states are visible in the UI. */
export function mockLatency(): Promise<void> {
  const ms = 200 + Math.random() * 300;
  return new Promise((resolve) => setTimeout(resolve, ms));
}
